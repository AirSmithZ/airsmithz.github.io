import { useEffect, useMemo } from "react";
import { renderLevelThumbnail } from "../data/levels";
import "./LevelSelect.css";

export default function LevelSelect({ clearedLevels, onSelect, onBack }) {
  const thumbnails = useMemo(() => {
    const map = {};
    for (let i = 1; i <= 6; i++) {
      map[i] = renderLevelThumbnail(i);
    }
    return map;
  }, []);

  return (
    <div className="level-select">
      <button type="button" className="pixel-btn level-back" onClick={onBack}>
        ← 返回
      </button>
      <h2 className="level-select-title">选择关卡</h2>
      <div className="level-grid">
        {[1, 2, 3, 4, 5, 6].map((id) => {
          const unlocked = id === 1 || clearedLevels.includes(id - 1);
          const cleared = clearedLevels.includes(id);
          const difficulty = id <= 3 ? "简单" : "困难";

          return (
            <button
              key={id}
              type="button"
              className={`level-card ${!unlocked ? "locked" : ""}`}
              disabled={!unlocked}
              onClick={() => unlocked && onSelect(id)}
            >
              <div className="level-thumb">
                {thumbnails[id] && (
                  <img src={thumbnails[id]} alt={`关卡 ${id}`} width={64} height={64} />
                )}
              </div>
              <span className="level-id">{id} / 6</span>
              <span className={`level-diff ${id <= 3 ? "easy" : "hard"}`}>{difficulty}</span>
              {cleared && <span className="level-cleared">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
