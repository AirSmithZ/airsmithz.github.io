import { useEffect, useRef, useCallback, memo } from "react";
import kaplay from "kaplay";
import { LEVELS } from "../data/levels";
import {
  findStart,
  findGoal,
  getMergedWallsOptimized,
  getObstacleCells,
} from "../utils/levelUtils";

const DEBUG_PERF = true; // 性能监控：设为 false 关闭控制台输出
const CELL_SIZE = 8;
const MAZE_SIZE = 32 * CELL_SIZE; // 256
const ROTATE_DELTA = 6;
const LERP_SPEED = 0.22; // 每帧向目标靠近，旋转与方块运动由同一 RAF 驱动，互不阻塞

/** 重力方向：0°=向下，90°=向右，180°=向上，270°=向左 */
function gravityFromAngle(deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.sin(rad), y: Math.cos(rad) };
}

function MazeGame({
  levelId,
  onWin,
  onLose,
  onPause,
  hudAngleRef,
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const currentAngleRef = useRef(0);
  const targetAngleRef = useRef(0);

  const handlePause = useCallback(() => onPause(), [onPause]);

  /** 应用角度到视觉+物理，不触发 React 重渲染 */
  const applyAngle = useCallback((angle) => {
    const a = ((angle % 360) + 360) % 360;
    if (containerRef.current) {
      containerRef.current.style.transform = `rotate(${a}deg)`;
    }
    const k = gameRef.current;
    if (k) {
      const g = gravityFromAngle(a);
      k.setGravityDirection(k.vec2(g.x, g.y));
    }
    if (hudAngleRef?.current) {
      hudAngleRef.current.textContent = Math.round(a) + "°";
    }
  }, [hudAngleRef]);

  // 用 ref 保存回调，避免 handleWin/handleLose 变化导致整个游戏销毁重建（解决卡顿）
  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  onWinRef.current = onWin;
  onLoseRef.current = onLose;

  useEffect(() => {
    const grid = LEVELS[levelId];
    if (!grid || !containerRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = MAZE_SIZE;
    canvas.height = MAZE_SIZE;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.imageRendering = "pixelated";
    containerRef.current.appendChild(canvas);

    // 推迟到下一事件循环初始化，确保上次 k.quit() 完成后再调用 kaplay()，避免 "already initialized" 警告
    let cancelled = false;
    let k = null;
    const tid = setTimeout(() => {
      if (cancelled || !containerRef.current?.contains(canvas)) return;
      k = kaplay({
      global: false,
      width: MAZE_SIZE,
      height: MAZE_SIZE,
      canvas,
      scale: 1,
      background: [13, 17, 23],
      crisp: true,
    });

    gameRef.current = k;

    const start = findStart(grid);
    const goal = findGoal(grid);
    const walls = getMergedWallsOptimized(grid);
    const obstacles = getObstacleCells(grid);

    k.setGravity(400);
    const g = gravityFromAngle(0);
    k.setGravityDirection(k.vec2(g.x, g.y));
    containerRef.current.style.transform = "rotate(0deg)";
    currentAngleRef.current = 0;
    targetAngleRef.current = 0;

    // 墙体（垂直合并后大幅减少物理体数量，friction:0 光滑无摩擦）
    walls.forEach(({ x, y, w, h = 1 }) => {
      k.add([
        k.rect(w * CELL_SIZE, h * CELL_SIZE),
        k.pos(x * CELL_SIZE, y * CELL_SIZE),
        k.anchor("topleft"),
        k.area(),
        k.body({ isStatic: true, friction: 0 }),
        k.color(48, 54, 61),
        "wall",
      ]);
    });

    // 障碍物（仅困难关）
    obstacles.forEach(({ x, y }) => {
      k.add([
        k.rect(CELL_SIZE, CELL_SIZE),
        k.pos(x * CELL_SIZE, y * CELL_SIZE),
        k.anchor("topleft"),
        k.area(),
        k.body({ isStatic: true, friction: 0, frictionStatic: 0 }),
        k.color(248, 81, 73),
        "obstacle",
      ]);
    });

    // 终点 4x4（friction:0 光滑）
    k.add([
      k.rect(4 * CELL_SIZE, 4 * CELL_SIZE),
      k.pos(goal.x * CELL_SIZE, goal.y * CELL_SIZE),
      k.anchor("topleft"),
      k.area(),
      k.body({ isStatic: true, friction: 0 }),
      k.color(63, 185, 80),
      "goal",
    ]);

    // 玩家
    const player = k.add([
      k.rect(CELL_SIZE, CELL_SIZE),
      k.pos(
        start.x * CELL_SIZE + CELL_SIZE / 2,
        start.y * CELL_SIZE + CELL_SIZE / 2
      ),
      k.anchor("center"),
      k.area(),
      k.body({ friction: 0, frictionStatic: 0, drag: 0 }),
      k.color(230, 237, 243),
      "player",
    ]);

    let hasEnded = false;

    const safeWin = () => {
      if (hasEnded) return;
      hasEnded = true;
      onWinRef.current();
    };
    const safeLose = (reason) => {
      if (hasEnded) return;
      hasEnded = true;
      onLoseRef.current(reason);
    };

    player.onCollide("goal", safeWin);

    player.onCollide("obstacle", () => safeLose("obstacle"));

    // 掉出边界
    k.onUpdate(() => {
      if (hasEnded) return;
      const pos = player.pos;
      if (
        pos.x < -16 ||
        pos.x > MAZE_SIZE + 16 ||
        pos.y < -16 ||
        pos.y > MAZE_SIZE + 16
      ) {
        safeLose("fall");
      }
    });
    });

    return () => {
      cancelled = true;
      clearTimeout(tid);
      if (k) {
        try { k.quit(); } catch (_) {}
      }
      canvas.remove();
      gameRef.current = null;
    };
  }, [levelId]); // 仅 levelId 变化时重建，地图初始化完成后禁止重复渲染

  // RAF 驱动旋转插值：视觉与物理每帧同步，与 KAPLAY 同属一个事件循环，互不阻塞
  const applyAngleRef = useRef(applyAngle);
  applyAngleRef.current = applyAngle;
  useEffect(() => {
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
      if (DEBUG_PERF && frameDeltas.length < 120) frameDeltas.push(dt);
      const current = currentAngleRef.current;
      const target = targetAngleRef.current;
      let diff = ((target - current + 540) % 360) - 180; // 取最短旋转方向
      if (Math.abs(diff) > 0.5) {
        const next = current + diff * LERP_SPEED;
        currentAngleRef.current = next;
        applyAngleRef.current(next);
        applyCount++;
      }
      if (DEBUG_PERF && now - lastLogAt >= 2000) {
        const fps = frameCount / ((now - lastLogAt) / 1000);
        const avgDt = frameDeltas.length ? frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length : 0;
        const maxDt = frameDeltas.length ? Math.max(...frameDeltas) : 0;
        let objCount = 0;
        let kapDt = "N/A";
        try {
          const k = gameRef.current;
          if (k?.get) objCount = k.get("*")?.length ?? 0;
          if (k?.dt) kapDt = (k.dt() * 1000).toFixed(2) + "ms";
        } catch (_) {}
        console.log("[MazeGame 性能]", {
          FPS: fps.toFixed(1),
          帧间隔ms: avgDt.toFixed(2),
          最大帧间隔ms: maxDt.toFixed(2),
          插值次数: applyCount,
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

  // 键盘控制：仅更新目标角度，由 RAF 插值
  useEffect(() => {
    const ROTATE_SPEED = 3;
    const handleKeyDown = (e) => {
      if (["a", "A", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        targetAngleRef.current = (targetAngleRef.current - ROTATE_SPEED + 360) % 360;
      } else if (["d", "D", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        targetAngleRef.current = (targetAngleRef.current + ROTATE_SPEED) % 360;
      } else if (e.key === "Escape" || e.key === "p") {
        e.preventDefault();
        handlePause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePause]);

  const DEG_PER_SECOND = 40; // 按住 1 秒 = 10°
  const repeatRafRef = useRef(null);
  const isPressedRef = useRef(false);
  const pressStartRef = useRef(0);
  const pressStartTargetRef = useRef(0);

  const stopRepeat = useCallback(() => {
    isPressedRef.current = false;
    if (repeatRafRef.current != null) {
      cancelAnimationFrame(repeatRafRef.current);
      repeatRafRef.current = null;
    }
    // 释放时把目标角度锁定到当前，插值循环立即停止，角度不再变化
    targetAngleRef.current = currentAngleRef.current;
  }, []);

  const createRotateHandlers = useCallback(
    (direction) => {
      const sign = direction === "left" ? -1 : 1;
      const loop = (now) => {
        if (!isPressedRef.current) return;
        const elapsedSec = (now - pressStartRef.current) / 1000;
        const deltaDeg = elapsedSec * DEG_PER_SECOND;
        targetAngleRef.current =
          (pressStartTargetRef.current + sign * deltaDeg + 360 * 1000) % 360;
        repeatRafRef.current = requestAnimationFrame(loop);
      };
      return {
        onPointerDown: (e) => {
          e.preventDefault();
          isPressedRef.current = true;
          pressStartRef.current = performance.now();
          pressStartTargetRef.current = targetAngleRef.current;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          repeatRafRef.current = requestAnimationFrame(loop);
        },
        onPointerUp: (e) => {
          e.currentTarget.releasePointerCapture?.(e.pointerId);
          stopRepeat();
        },
        onPointerLeave: stopRepeat,
        onPointerCancel: stopRepeat,
        onContextMenu: (e) => e.preventDefault(),
      };
    },
    [stopRepeat]
  );

  return (
    <div className="maze-wrap">
      <div className="maze-rotation-viewport">
        <div ref={containerRef} className="maze-container" />
      </div>
      <div className="virtual-buttons">
        <button
          type="button"
          className="pixel-btn rotate-btn"
          {...createRotateHandlers("left")}
        >
          ←
        </button>
        <button
          type="button"
          className="pixel-btn rotate-btn"
          {...createRotateHandlers("right")}
        >
          →
        </button>
      </div>
    </div>
  );
}

export default memo(MazeGame);
