/**
 * 关卡工具：起点、终点、墙体合并、障碍物
 */

export function findStart(grid) {
  // 左下角入口：从最后一行往上、从左往右找第一个通道
  for (let y = 31; y >= 0; y--) {
    for (let x = 0; x < 32; x++) {
      if (grid[y][x] === "0") return { x, y };
    }
  }
  return { x: 1, y: 30 };
}

export function findGoal(grid) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (grid[y][x] === "G") return { x, y };
    }
  }
  return { x: 30, y: 27 };
}

/** 按行合并连续墙体为 {x,y,w}[] */
export function getMergedWalls(grid) {
  const segments = [];
  for (let y = 0; y < 32; y++) {
    const row = grid[y];
    let x = 0;
    while (x < 32) {
      if (row[x] === "1") {
        let w = 0;
        while (x + w < 32 && row[x + w] === "1") w++;
        segments.push({ x, y, w });
        x += w;
      } else {
        x++;
      }
    }
  }
  return segments;
}

/** 在水平合并基础上再垂直合并，返回 {x,y,w,h}[]，大幅减少物理体数量（323→~50） */
export function getMergedWallsOptimized(grid) {
  const flat = getMergedWalls(grid);
  const key = (s) => `${s.x},${s.y},${s.w}`;
  const used = new Set();
  const result = [];
  for (const s of flat) {
    if (used.has(key(s))) continue;
    let h = 1;
    used.add(key(s));
    for (let dy = 1; s.y + dy < 32; dy++) {
      const below = flat.find((t) => t.x === s.x && t.y === s.y + dy && t.w === s.w);
      if (!below || used.has(key(below))) break;
      used.add(key(below));
      h++;
    }
    result.push({ x: s.x, y: s.y, w: s.w, h });
  }
  return result;
}

export function getObstacleCells(grid) {
  const cells = [];
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (grid[y][x] === "X") cells.push({ x, y });
    }
  }
  return cells;
}

/** 渲染 64x64 缩略图到 canvas，用于关卡卡片。若 grid 无效则返回 null。 */
export function renderLevelPreview(grid, size = 64) {
  if (!grid || !Array.isArray(grid) || grid.length < 32) return null;
  for (let y = 0; y < 32; y++) {
    const row = grid[y];
    if (!row || (typeof row === "string" && row.length < 32)) return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const scale = size / 32;
  for (let y = 0; y < 32; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < 32; x++) {
      const cell = row[x];
      if (cell === "1") ctx.fillStyle = "#30363d";
      else if (cell === "G") ctx.fillStyle = "#3fb950";
      else if (cell === "X") ctx.fillStyle = "#f85149";
      else ctx.fillStyle = "#0d1117";
      ctx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
    }
  }
  return canvas.toDataURL();
}

/** 安全渲染预览，捕获异常时返回 null */
export function safeLevelPreview(grid, size = 64) {
  try {
    return renderLevelPreview(grid, size);
  } catch {
    return null;
  }
}
