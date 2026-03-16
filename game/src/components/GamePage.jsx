import { useState, useCallback, useRef } from "react";
import MazeGame from "./MazeGame";

export default function GamePage({ levelId, onWin, onLose, onBack, onRetry }) {
  const [paused, setPaused] = useState(false);
  const hudAngleRef = useRef(null); // 通过 ref 更新角度显示，避免旋转时触发重渲染

  const handleWin = useCallback(() => onWin(), [onWin]);

  const handleLose = useCallback(
    (reason) => {
      onLose(reason);
    },
    [onLose]
  );

  const handlePause = useCallback(() => {
    setPaused(true);
  }, []);

  return (
    <div className="game-page">
      {paused && (
        <div className="pause-menu">
          <h2 className="pixel-title">暂停</h2>
          <button
            type="button"
            className="pixel-btn"
            onClick={() => setPaused(false)}
          >
            继续游戏
          </button>
          <button
            type="button"
            className="pixel-btn"
            onClick={() => {
              setPaused(false);
              onRetry?.();
            }}
          >
            重新开始
          </button>
          <button
            type="button"
            className="pixel-btn"
            onClick={() => {
              setPaused(false);
              onBack();
            }}
          >
            返回关卡
          </button>
        </div>
      )}
      <div className="hud">
        <span className="hud-level">{levelId + 1} / 6</span>
        <span ref={hudAngleRef} className="hud-gravity">0°</span>
        <button
          type="button"
          className="pixel-btn hud-pause"
          onClick={handlePause}
        >
          暂停
        </button>
      </div>
      <MazeGame
        levelId={levelId}
        onWin={handleWin}
        onLose={handleLose}
        onPause={handlePause}
        hudAngleRef={hudAngleRef}
      />
    </div>
  );
}
