import { useEffect, useRef, useState, useCallback } from "react";
import kaplay from "kaplay";
import { getTransformedLevel, GRID_SIZE, CELL_SIZE } from "../data/levels";
import "./MazeGame.css";

const GRAVITY_STRENGTH = 400;
const MAZE_PX = GRID_SIZE * CELL_SIZE;
const ROTATE_SPEED = 120; // 度/秒，长按时每秒钟旋转的角度
const DEBUG_PERF = false; // 设为 true 时每 2 秒打印性能指标到控制台
// 单例：KAPLAY 只初始化一次，unmount 时移走 canvas 而非 quit，避免 "already initialized" 警告
let _kaplayCtx = null;
let _kaplayCanvas = null;
let _canvasHolder = null;

function getOrCreateKaplay(container) {
  if (_kaplayCtx && _kaplayCanvas) {
    if (_canvasHolder && _kaplayCanvas.parentNode === _canvasHolder) {
      container.appendChild(_kaplayCanvas);
    }
    return _kaplayCtx;
  }
  if (!_canvasHolder) {
    _canvasHolder = document.createElement("div");
    _canvasHolder.style.cssText = "position:fixed;left:-9999px;top:-9999px;pointer-events:none;";
    document.body.appendChild(_canvasHolder);
  }
  const canvas = document.createElement("canvas");
  canvas.width = MAZE_PX;
  canvas.height = MAZE_PX;
  canvas.style.imageRendering = "pixelated";
  container.appendChild(canvas);
  _kaplayCanvas = canvas;
  _kaplayCtx = kaplay({
    global: false,
    canvas,
    width: MAZE_PX,
    height: MAZE_PX,
    background: [13, 17, 23],
  });
  return _kaplayCtx;
}

function hideCanvas() {
  if (_kaplayCanvas && _canvasHolder) {
    _kaplayCanvas.remove();
    _canvasHolder.appendChild(_kaplayCanvas);
  }
}

// 2D 矩形合并：将 grid 中连续墙格合并为尽可能大的矩形，大幅减少物理对象
function mergeWallsIntoRects(grid) {
  const used = grid.map((row) => row.map(() => false));
  const rects = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y]?.[x] !== "1" || used[y][x]) continue;
      let w = 0;
      while (x + w < GRID_SIZE && grid[y][x + w] === "1" && !used[y][x + w]) w++;
      let h = 0;
      for (let y2 = y; y2 < GRID_SIZE; y2++) {
        let ok = true;
        for (let dx = 0; dx < w; dx++) {
          if (grid[y2]?.[x + dx] !== "1" || used[y2][x + dx]) {
            ok = false;
            break;
          }
        }
        if (!ok) break;
        h++;
      }
      rects.push({ x, y, w, h });
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          used[y + dy][x + dx] = true;
        }
      }
    }
  }
  return rects;
}

// 根据旋转角度（度）计算重力方向：(0,1)=下, (1,0)=右, (0,-1)=上, (-1,0)=左
function gravityFromAngle(deg) {
  const rad = (deg * Math.PI) / 180;
  return [Math.sin(rad), Math.cos(rad)];
}

export default function MazeGame({
  levelId,
  onWin,
  onLose,
  onPause,
}) {
  const containerRef = useRef(null);
  const angleDisplayRef = useRef(null);
  const rotationAngleRef = useRef(0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const holdDirectionRef = useRef(0); // -1 左, 1 右, 0 未按住
  const rafIdRef = useRef(null);
  const lastTimeRef = useRef(0);
  const lastDomUpdateRef = useRef(0);
  const gameRef = useRef(null); // 供性能监控获取 KAPLAY 对象数
  const tickApplyCountRef = useRef(0);

  // 用 ref 持有回调，避免 effect 依赖变化导致频繁重建场景（主性能瓶颈之一）
  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  onWinRef.current = onWin;
  onLoseRef.current = onLose;

  const tick = useCallback(() => {
    const dir = holdDirectionRef.current;
    if (dir === 0) {
      rafIdRef.current = null;
      return;
    }
    const now = performance.now();
    const dt = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;

    const delta = ROTATE_SPEED * dt * dir;
    const next = ((rotationAngleRef.current + delta) % 360 + 360) % 360;
    rotationAngleRef.current = next;
    if (DEBUG_PERF) tickApplyCountRef.current = (tickApplyCountRef.current || 0) + 1;

    // transform 不触发布局，每帧更新保证旋转流畅
    if (containerRef.current) {
      containerRef.current.style.transform = `rotate(${next}deg)`;
    }
    // 角度文字节流到 ~20fps，减少主线程布局压力
    if (now - lastDomUpdateRef.current > 50 && angleDisplayRef.current) {
      lastDomUpdateRef.current = now;
      angleDisplayRef.current.textContent = `${Math.round(next)}°`;
    }

    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  const handlePointerDown = useCallback(
    (direction) => (e) => {
      e.preventDefault();
      if (holdDirectionRef.current === 0) {
        lastTimeRef.current = performance.now();
      }
      holdDirectionRef.current = direction;
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(tick);
      }
    },
    [tick]
  );

  const handlePointerUp = useCallback(() => {
    holdDirectionRef.current = 0;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setRotationAngle(rotationAngleRef.current);
  }, []);

  // 性能监控：每 2 秒打印 FPS、帧间隔、游戏对象数等
  useEffect(() => {
    if (!DEBUG_PERF) return;
    let rafId = null;
    let lastNow = performance.now();
    let frameCount = 0;
    let applyCount = 0;
    let lastLogAt = lastNow;
    const frameDeltas = [];
    const loop = (now) => {
      frameCount++;
      const dt = now - lastNow;
      lastNow = now;
      if (frameDeltas.length < 120) frameDeltas.push(dt);
      applyCount += tickApplyCountRef.current || 0;
      tickApplyCountRef.current = 0;
      if (now - lastLogAt >= 2000) {
        const fps = frameCount / ((now - lastLogAt) / 1000);
        const avgDt = frameDeltas.length ? frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length : 0;
        const maxDt = frameDeltas.length ? Math.max(...frameDeltas) : 0;
        let objCount = 0;
        let kapDt = "N/A";
        try {
          const k = gameRef.current;
          if (k?.get) objCount = k.get("*")?.length ?? 0;
          if (k?.dt) kapDt = `${(k.dt() * 1000).toFixed(2)}ms`;
        } catch (_) {}
        console.log("[MazeGame 性能]", {
          FPS: fps.toFixed(1),
          帧间隔ms: avgDt.toFixed(2),
          最大帧间隔ms: maxDt.toFixed(2),
          旋转应用次数: applyCount,
          游戏对象数: objCount,
          KAPLAY_dt: kapDt,
        });
        frameCount = 0;
        applyCount = 0;
        frameDeltas.length = 0;
        lastLogAt = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !levelId) return;

    const level = getTransformedLevel(levelId, 0);
    if (!level) return;

    containerRef.current.innerHTML = "";
    const k = getOrCreateKaplay(containerRef.current);
    gameRef.current = k;

    const startTime = Date.now();
    let gameEnded = false;

    const onKeyDown = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        if (holdDirectionRef.current === 0) {
          lastTimeRef.current = performance.now();
        }
        holdDirectionRef.current = -1;
        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(tick);
        }
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        if (holdDirectionRef.current === 0) {
          lastTimeRef.current = performance.now();
        }
        holdDirectionRef.current = 1;
        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(tick);
        }
      }
    };
    const onKeyUp = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A" || e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        holdDirectionRef.current = 0;
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        setRotationAngle(rotationAngleRef.current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    k.scene("maze", () => {
      if (typeof k.setGravity === "function") k.setGravity(0);

      const { grid, start, goal, obstacles, isHard, bounds = { top: true, bottom: true, left: true, right: true } } = level;
      const cell = CELL_SIZE;

      // 2D 矩形合并墙体，大幅减少物理对象数量
      const wallRects = mergeWallsIntoRects(grid);
      for (const { x, y, w, h } of wallRects) {
        k.add([
          k.pos(x * cell, y * cell),
          k.rect(w * cell, h * cell),
          k.color(48, 54, 61),
          k.area(),
          k.body({ isStatic: true }),
          "wall",
        ]);
      }

      // 根据 bounds 封闭迷宫四边，后续可对某面设 false 增加开口难度
      // 底墙加厚（BOTTOM_THICK）防止高速下落时物理穿透（tunneling）
      const thick = cell;
      const BOTTOM_THICK = 32; // 底墙需足够厚，避免 vel*dt 单帧穿透（400*0.08≈32）
      if (bounds.left) {
        k.add([k.pos(-thick, 0), k.rect(thick, MAZE_PX + thick * 2), k.area(), k.body({ isStatic: true }), "wall"]);
      }
      if (bounds.right) {
        k.add([k.pos(MAZE_PX, 0), k.rect(thick, MAZE_PX + thick * 2), k.area(), k.body({ isStatic: true }), "wall"]);
      }
      if (bounds.top) {
        k.add([k.pos(0, -thick), k.rect(MAZE_PX + thick * 2, thick), k.area(), k.body({ isStatic: true }), "wall"]);
      }
      if (bounds.bottom) {
        k.add([k.pos(0, MAZE_PX), k.rect(MAZE_PX + thick * 2, BOTTOM_THICK), k.area(), k.body({ isStatic: true }), "wall"]);
      }

      if (isHard) {
        for (const { x, y } of obstacles) {
          k.add([
            k.pos(x * cell, y * cell),
            k.rect(cell, cell),
            k.color(248, 81, 73),
            k.area(),
            k.body({ isStatic: true }),
            "obstacle",
          ]);
        }
      }

      const goalSize = 4 * cell;
      k.add([
        k.pos(goal.x * cell, goal.y * cell),
        k.rect(goalSize, goalSize),
        k.color(63, 185, 80),
        k.area(),
        "goal",
      ]);

      // 1 格方块，适配 1 格宽通道，避免 4 格方块超出边界或卡墙
      const playerSize = cell;
      const player = k.add([
        k.pos(start.x * cell, start.y * cell),
        k.rect(playerSize, playerSize),
        k.color(230, 237, 243),
        k.area(),
        k.body({ isStatic: false }),
        "player",
      ]);

      // 首帧 dt 可能过大导致物理一步把方块推出边界，前几帧不应用重力
      let updateFrameCount = 0;
      const SETTLE_FRAMES = 3;

      k.onUpdate(() => {
        if (gameEnded) return;
        updateFrameCount++;
        const [gx, gy] = gravityFromAngle(rotationAngleRef.current);
        if (updateFrameCount > SETTLE_FRAMES) {
          player.vel.x = gx * GRAVITY_STRENGTH;
          player.vel.y = gy * GRAVITY_STRENGTH;
        } else {
          player.vel.x = 0;
          player.vel.y = 0;
        }

        const px = player.pos.x;
        const py = player.pos.y;
        // 仅在完全超出墙体外边界时判定失败；墙体内（含与地板重叠）不判负
        const outL = -thick - playerSize;       // 左墙外
        const outR = MAZE_PX + thick;           // 右墙外
        const outT = -thick - playerSize;      // 上墙外
        const outB = MAZE_PX + BOTTOM_THICK;   // 底墙外（地板厚 32px）
        const outOfBounds =
          px + playerSize < outL || px > outR ||
          py + playerSize < outT || py > outB;
        if (updateFrameCount > SETTLE_FRAMES && outOfBounds) {
          gameEnded = true;
          onLoseRef.current(Math.floor((Date.now() - startTime) / 1000));
        }
      });

      player.onCollide("obstacle", () => {
        if (!gameEnded) {
          gameEnded = true;
          onLoseRef.current(Math.floor((Date.now() - startTime) / 1000));
        }
      });

      player.onCollide("goal", () => {
        if (!gameEnded) {
          gameEnded = true;
          onWinRef.current(Math.floor((Date.now() - startTime) / 1000));
        }
      });
    });

    k.go("maze");

    return () => {
      gameRef.current = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      holdDirectionRef.current = 0;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      hideCanvas();
    };
  }, [levelId, tick]);

  return (
    <div className="maze-game">
      <div className="maze-hud">
        <span className="maze-level">{levelId} / 6</span>
        <span className="maze-gravity-indicator">
          <span className="maze-gravity-angle" ref={angleDisplayRef}>{Math.round(rotationAngle)}°</span>
        </span>
        <button type="button" className="pixel-btn pause-btn" onClick={onPause}>
          暂停
        </button>
      </div>
      <div className="maze-wrap" style={{ "--maze-size": `${MAZE_PX}px` }}>
        <div
          ref={(el) => {
            containerRef.current = el;
            if (el) el.style.transform = `rotate(${rotationAngleRef.current}deg)`;
          }}
          className="maze-canvas-wrap"
        />
      </div>
      <div className="maze-controls">
        <div className="virtual-keys">
          <div className="vk-row">
            <button
              type="button"
              className="vk vk-rotate"
              onPointerDown={handlePointerDown(-1)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
            >
              旋转左
            </button>
            <button
              type="button"
              className="vk vk-rotate"
              onPointerDown={handlePointerDown(1)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
            >
              旋转右
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
