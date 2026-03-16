import { useEffect, useRef } from "react";
import kaboom from "kaboom";
import "./Game.css";

function Game() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    containerRef.current.appendChild(canvas);

    const k = kaboom({
      global: false,
      canvas,
      width: 800,
      height: 600,
      background: [26, 26, 46], // #1a1a2e
    });

    // 基础游戏场景
    k.scene("main", () => {
      // 标题文字
      k.add([
        k.text("Kaboom.js 游戏", { size: 48 }),
        k.pos(k.width() / 2, 80),
        k.anchor("center"),
        k.color(255, 255, 255),
      ]);

      // 可移动的方块（使用 WASD 或方向键）
      const player = k.add([
        k.rect(40, 40),
        k.pos(k.width() / 2 - 20, k.height() / 2 - 20),
        k.area(),
        k.color(100, 200, 255),
        k.anchor("center"),
      ]);

      const SPEED = 240; // 像素/秒

      k.onUpdate(() => {
        const dt = k.dt();
        if (k.isKeyDown("left")) player.pos.x -= SPEED * dt;
        if (k.isKeyDown("right")) player.pos.x += SPEED * dt;
        if (k.isKeyDown("up")) player.pos.y -= SPEED * dt;
        if (k.isKeyDown("down")) player.pos.y += SPEED * dt;

        // 边界限制
        player.pos.x = Math.max(20, Math.min(k.width() - 20, player.pos.x));
        player.pos.y = Math.max(20, Math.min(k.height() - 20, player.pos.y));
      });

      // 提示文字
      k.add([
        k.text("方向键 或 WASD 移动", { size: 20 }),
        k.pos(k.width() / 2, k.height() - 40),
        k.anchor("center"),
        k.color(180, 180, 180),
      ]);
    });

    k.go("main");

    return () => {
      // Kaboom 的 destroy 是销毁游戏对象用，不是清理 context，直接移除 canvas 即可
      if (containerRef.current && canvas.parentNode) {
        containerRef.current.removeChild(canvas);
      }
    };
  }, []);

  return <div ref={containerRef} className="game-container" />;
}

export default Game;
