"""
建筑图纸墙体识别：颜色 + 线宽区分墙体与标注，不调用 LLM。
- 颜色：保留深灰/黑（墙体线），排除白背景、红（楼梯）、绿/蓝等彩色（家具、标注色块）。
- 线厚：只保留粗线轮廓（周长²/面积 ≤ 阈值），细尺寸线、标注线不标为墙。
"""

import cv2
import numpy as np
import requests
from pathlib import Path
from typing import Any, Sequence

# 墙体色：灰色（含深灰、黑），排除纯白背景与彩色
GREY_WALL_LO = 0
GREY_WALL_HI = 248
GREY_CHANNEL_DIFF_MAX = 60
RED_MIN = 90
RED_OVER_G = 35
RED_OVER_B = 35
# 线厚：① thin_ratio = 周长²/面积 ≤ 此值；② 或 等效线宽 2*area/perimeter ≥ 最小厚度
WALL_MAX_THIN_RATIO = 420
WALL_MIN_THICKNESS_PX = 2.0

ELEMENT_WALL = "wall"


def _is_grey_color(bgr: np.ndarray) -> np.ndarray:
    """灰/黑：BGR 三通道接近且均值在范围内（深灰墙、黑线均可；排除白背景与绿/蓝/红）。"""
    b, g, r = bgr[:, :, 0], bgr[:, :, 1], bgr[:, :, 2]
    max_channel = np.maximum(np.maximum(b, g), r)
    min_channel = np.minimum(np.minimum(b, g), r)
    channel_diff = max_channel - min_channel
    channel_mean = (b + g + r) / 3.0
    is_grey = (
        (channel_diff < GREY_CHANNEL_DIFF_MAX)
        & (channel_mean >= GREY_WALL_LO)
        & (channel_mean <= GREY_WALL_HI)
    )
    return is_grey


def _is_red_color(bgr: np.ndarray) -> np.ndarray:
    """红色：R 明显高于 G、B（排除红色楼梯被标成墙）。"""
    b, g, r = bgr[:, :, 0], bgr[:, :, 1], bgr[:, :, 2]
    return (r >= RED_MIN) & (r > g + RED_OVER_G) & (r > b + RED_OVER_B)


def _binary_grey_walls(img_bgr: np.ndarray) -> np.ndarray:
    """只保留灰/黑像素（墙体线），排除白背景与红色（楼梯）。"""
    is_grey = _is_grey_color(img_bgr)
    is_red = _is_red_color(img_bgr)
    return np.where(is_grey & ~is_red, 255, 0).astype(np.uint8)


def _mask_annotation_regions(
    binary: np.ndarray,
    boxes_px: Sequence[tuple[int, int, int, int]],
    expand_px: int,
) -> np.ndarray:
    """在二值图上将标注区域填为背景 0。"""
    out = binary.copy()
    h, w = out.shape[:2]
    for (x1, y1, x2, y2) in boxes_px:
        x1 = max(0, x1 - expand_px)
        y1 = max(0, y1 - expand_px)
        x2 = min(w, x2 + expand_px)
        y2 = min(h, y2 + expand_px)
        out[y1:y2, x1:x2] = 0
    return out


def _contour_to_normalized_polygon(contour: np.ndarray, w: int, h: int) -> list[list[float]]:
    """将轮廓转为归一化 [0..1] 多边形顶点列表 [[x,y], ...]。"""
    if contour is None or len(contour) < 2:
        return []
    pts = contour.reshape(-1, 2)
    return [[float(x) / w, float(y) / h] for x, y in pts]


def _is_wall_contour(contour: np.ndarray, total_px: int) -> bool:
    """
    墙体：先灰色（二值图已保证），再按「线厚」过滤。
    满足其一即可：thin_ratio ≤ 阈值，或 等效线宽 2*area/perimeter ≥ 最小厚度。
    """
    area = cv2.contourArea(contour)
    if area < 1e-6:
        return False
    min_wall_area = max(150, int(total_px * 0.0006))
    if area < min_wall_area:
        return False
    perimeter = cv2.arcLength(contour, True)
    if perimeter < 1e-6:
        return False
    thin_ratio = (perimeter * perimeter) / area
    thickness = 2.0 * area / perimeter
    return thin_ratio <= WALL_MAX_THIN_RATIO or thickness >= WALL_MIN_THICKNESS_PX


def _find_contours_from_binary(
    binary: np.ndarray,
    kernel_size: int = 5,
    total_px: int | None = None,
) -> tuple[list, np.ndarray]:
    """
    形态学后找轮廓。用 (2,2) 开运算避免厚墙被腐蚀掉，再闭运算连通。
    """
    k = max(3, min(7, kernel_size))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    opened = cv2.morphologyEx(binary, cv2.MORPH_OPEN, small)
    closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)
    contours, hierarchy = cv2.findContours(closed, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None:
        hierarchy = np.zeros((1, 0, 4), dtype=np.int32)
    return contours, hierarchy


def classify_floor_plan_elements(
    image_input: str | Path | np.ndarray,
    annotation_boxes_px: Sequence[tuple[int, int, int, int]] | None = None,
) -> dict[str, Any]:
    """
    仅识别墙体：灰图块 + 排除红色（楼梯）+ 线厚过滤（粗线=墙）。
    返回结构保留 doors/windows/... 空列表以兼容 API/前端。
    """
    if isinstance(image_input, np.ndarray):
        img = image_input
    elif isinstance(image_input, (str, Path)):
        path = str(image_input)
        if path.startswith(("http://", "https://")):
            try:
                response = requests.get(path, timeout=30)
                img_array = np.asarray(bytearray(response.content), dtype=np.uint8)
                img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            except Exception:
                img = cv2.imread(path)
        else:
            img = cv2.imread(path)
    else:
        img = None

    if img is None:
        raise ValueError("图片加载失败")

    h, w = img.shape[:2]
    total_px = w * h
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    k_size = max(3, min(9, min(w, h) // 150))

    walls: list[list[list[float]]] = []

    img_grey = _binary_grey_walls(img)
    grey_count = int(np.sum(img_grey == 255))
    if grey_count < total_px * 0.02:
        b, g, r = img[:, :, 0], img[:, :, 1], img[:, :, 2]
        is_red = _is_red_color(img)
        ch_max = np.maximum(np.maximum(b, g), r)
        ch_min = np.minimum(np.minimum(b, g), r)
        is_low_sat = (ch_max - ch_min) < 70
        img_grey = np.where(
            (gray >= GREY_WALL_LO) & (gray <= GREY_WALL_HI) & ~is_red & is_low_sat,
            255, 0,
        ).astype(np.uint8)
    if np.sum(img_grey == 255) < total_px * 0.005:
        _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        if np.mean(otsu) > 127:
            otsu = 255 - otsu
        is_red = _is_red_color(img)
        is_grey = _is_grey_color(img)
        img_grey = np.where((otsu == 255) & ~is_red & is_grey, 255, 0).astype(np.uint8)
    if annotation_boxes_px:
        img_grey = _mask_annotation_regions(img_grey, annotation_boxes_px, max(3, min(w, h) // 200))

    n_white = int(np.sum(img_grey == 255))
    contours, _ = _find_contours_from_binary(img_grey, k_size, total_px=total_px)
    for cnt in contours:
        if not _is_wall_contour(cnt, total_px):
            continue
        poly = _contour_to_normalized_polygon(cnt, w, h)
        if len(poly) >= 2:
            walls.append(poly)
    if not walls and contours:
        min_area_loose = max(80, int(total_px * 0.0003))
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area_loose:
                continue
            per = cv2.arcLength(cnt, True)
            if per < 1e-6:
                continue
            thin = (per * per) / area
            thickness = 2.0 * area / per
            if thin <= 500 or thickness >= 1.5:
                poly = _contour_to_normalized_polygon(cnt, w, h)
                if len(poly) >= 2:
                    walls.append(poly)

    out = {
        "walls": walls,
        "doors": [],
        "windows": [],
        "stairs": [],
        "columns": [],
        "furniture": [],
        "zones": [],
        "annotations": [],
        "image_size": [w, h],
    }
    print(
        f"[FloorPlanElements] image_size=({w},{h}) grey_white_px={n_white} contours={len(contours)} walls={len(walls)}"
    )
    return out


def _load_image_for_walls(image_input: str | Path | np.ndarray) -> np.ndarray:
    """加载图片为 BGR，供 get_wall_contours / wall_edge_detection 使用。"""
    if isinstance(image_input, np.ndarray):
        return image_input
    path = str(image_input)
    if path.startswith(("http://", "https://")):
        try:
            response = requests.get(path, timeout=30)
            img_array = np.asarray(bytearray(response.content), dtype=np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        except Exception:
            img = cv2.imread(path)
    else:
        img = cv2.imread(path)
    if img is None:
        raise ValueError("图片加载失败，请检查 URL/路径是否正确")
    return img


def _get_wall_contours_from_img(
    img: np.ndarray,
    annotation_boxes_px: Sequence[tuple[int, int, int, int]] | None = None,
) -> tuple[list[np.ndarray], int, int]:
    """
    与 outline-walls 同一套管线：灰区二值化 → 形态学闭运算 → findContours → 面积+虚线过滤。
    入参为已加载的 BGR 图，返回 (墙轮廓列表, width, height)。
    """
    h, w = img.shape[:2]

    img_binary = _binary_grey_walls(img)
    if np.sum(img_binary == 255) < (w * h * 0.01):
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        img_binary = np.where((gray >= GREY_WALL_LO) & (gray <= GREY_WALL_HI), 255, 0).astype(np.uint8)
        is_red = _is_red_color(img)
        img_binary = np.where(~is_red & (img_binary == 255), 255, 0).astype(np.uint8)
        if np.sum(img_binary == 255) < (w * h * 0.01):
            _, img_binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            if np.mean(img_binary) > 127:
                img_binary = 255 - img_binary
            is_grey = _is_grey_color(img)
            img_binary = np.where(is_grey & ~is_red & (img_binary == 255), 255, 0).astype(np.uint8)

    if annotation_boxes_px:
        expand_px = max(3, min(w, h) // 200)
        img_binary = _mask_annotation_regions(img_binary, annotation_boxes_px, expand_px)

    kernel_size = max(3, min(9, min(w, h) // 150))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    img_closed = cv2.morphologyEx(img_binary, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(img_closed, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    total_px = w * h
    wall_contours = [c for c in contours if _is_wall_contour(c, total_px)]

    return wall_contours, w, h


def get_wall_contours(
    image_input: str | Path | np.ndarray,
    annotation_boxes_px: Sequence[tuple[int, int, int, int]] | None = None,
) -> tuple[list[np.ndarray], int, int]:
    """
    与 outline-walls 同一套管线：灰区二值化 → 形态学闭运算 → findContours → 面积+虚线过滤。
    返回 (墙轮廓列表, width, height)，供描边绘图或 detect-walls 转为线段 JSON。
    """
    img = _load_image_for_walls(image_input)
    return _get_wall_contours_from_img(img, annotation_boxes_px)


def wall_edge_detection(
    image_input: str | Path | np.ndarray,
    save_path: str | None = "wall_edges.png",
    annotation_boxes_px: Sequence[tuple[int, int, int, int]] | None = None,
) -> np.ndarray:
    """
    建筑图纸墙体描边：只描墙体宽高边界，不调用 LLM。
    与 outline-walls 一致，使用同一套轮廓管线后描边。
    """
    img = _load_image_for_walls(image_input)
    wall_contours, w, h = _get_wall_contours_from_img(img, annotation_boxes_px)

    result_img = img.copy()
    cv2.drawContours(
        result_img,
        wall_contours,
        -1,
        (11, 58, 138),
        1,
        lineType=cv2.LINE_AA,
    )
    if save_path:
        cv2.imwrite(save_path, result_img)
        print(f"描边结果已保存至：{save_path}")
    return result_img


def wall_edge_detection_to_png_bytes(
    image_path: str | Path,
    annotation_boxes_px: Sequence[tuple[int, int, int, int]] | None = None,
) -> bytes:
    """
    从本地图片路径生成描边图，返回 PNG 字节（供 API 直接返回）。
    不调用 LLM，不写文件。
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    img = cv2.imread(str(path))
    if img is None:
        from PIL import Image
        pil_img = Image.open(path).convert("RGB")
        img = np.array(pil_img)[:, :, ::-1].copy()
    result = wall_edge_detection(
        img,
        save_path=None,
        annotation_boxes_px=annotation_boxes_px,
    )
    _, png_bytes = cv2.imencode(".png", result)
    return png_bytes.tobytes()


def classify_floor_plan_elements_to_dict(
    image_path: str | Path,
    annotation_boxes_px: Sequence[tuple[int, int, int, int]] | None = None,
) -> dict[str, Any]:
    """从本地图片路径做元素分类，返回 JSON 可序列化的 dict（供 API）。"""
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    img = cv2.imread(str(path))
    if img is None:
        from PIL import Image
        pil_img = Image.open(path).convert("RGB")
        img = np.array(pil_img)[:, :, ::-1].copy()
    return classify_floor_plan_elements(img, annotation_boxes_px=annotation_boxes_px)