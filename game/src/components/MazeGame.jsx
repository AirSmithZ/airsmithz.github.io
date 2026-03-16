import { useEffect, useRef, useState, useCallback } from "react";
import kaplay from "kaplay";
import { getTransformedLevel, GRID_SIZE, CELL_SIZE } from "../data/levels";
import "./MazeGame.css";

const GRAVITY_STRENGTH = 400;
const MAZE_PX = GRID_SIZE * CELL_SIZE;
const ROTATE_SPEED = 120; // 度/秒，长按时每秒钟旋转的角度
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

  useEffect(() => {
    if (!containerRef.current || !levelId) return;

    const level = getTransformedLevel(levelId, 0);
    if (!level) return;

    containerRef.current.innerHTML = "";
    const k = getOrCreateKaplay(containerRef.current);

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

      const { grid, start, goal, obstacles, isHard } = level;
      const cell = CELL_SIZE;

      // 墙体按行合并为连续矩形，大幅减少物理对象数量（几百个 -> 几十个）
      for (let y = 0; y < GRID_SIZE; y++) {
        const row = grid[y];
        let x = 0;
        while (x < GRID_SIZE) {
          if (row?.[x] === "1") {
            let w = 0;
            while (x + w < GRID_SIZE && row[x + w] === "1") w++;
            k.add([
              k.pos(x * cell, y * cell),
              k.rect(w * cell, cell),
              k.color(48, 54, 61),
              k.area(),
              k.body({ isStatic: true }),
              "wall",
            ]);
            x += w;
          } else {
            x++;
          }
        }
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

      // 底部物理边界：贴紧画布底部，防止方块在重力作用下掉出（墙体拖住方块）
      k.add([
        k.pos(-16, MAZE_PX),
        k.rect(MAZE_PX + 32, 16),
        k.area(),
        k.body({ isStatic: true }),
        "floor",
      ]);

      k.onUpdate(() => {
        if (gameEnded) return;
        const [gx, gy] = gravityFromAngle(rotationAngleRef.current);
        // 直接赋值，避免每帧创建 vec2 对象
        player.vel.x = gx * GRAVITY_STRENGTH;
        player.vel.y = gy * GRAVITY_STRENGTH;

        const px = player.pos.x;
        const py = player.pos.y;
        const margin = playerSize + 8;
        if (px < -margin || py < -margin || px > MAZE_PX + margin || py > MAZE_PX + margin) {
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
