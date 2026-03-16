import { LEVELS, LEVEL_META } from "../data/levels";
import { safeLevelPreview } from "../utils/levelUtils";

const STORAGE_KEY = "gravity-maze-cleared";

function getClearedLevel() {
  try {
    const v = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    return Math.min(Math.max(0, v), 6);
  } catch {
    return 0;
  }
}

function setClearedLevel(n) {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.min(n, 6)));
  } catch (_) {}
}

export { getClearedLevel, setClearedLevel };

export default function LevelSelect({ onSelect, onBack, cleared }) {
  const clearedVal = cleared ?? getClearedLevel();
  const maxUnlocked = clearedVal;

  return (
    <div className="pixel-page level-select-page">
      <h1 className="pixel-title">选择关卡</h1>
      <div className="level-grid">
        {LEVEL_META.map((meta, i) => {
          // const unlocked = i <= maxUnlocked;
          const unlocked = true;
          const done = i < clearedVal;
          const grid = LEVELS[i];
          const preview = grid ? safeLevelPreview(grid) : null;
          return (
            <button
              key={meta.id}
              type="button"
              className={`pixel-btn level-card ${unlocked ? "" : "locked"}`}
              onClick={() => unlocked && onSelect(i)}
              disabled={!unlocked}
            >
              <div className="level-preview">
                {preview && <img src={preview} width={64} height={64} alt="" />}
              </div>
              <span className="level-name">{meta.name}</span>
              <span className={`level-difficulty ${meta.difficulty}`}>
                {meta.difficulty === "easy" ? "简单" : "困难"}
              </span>
              {done && <span className="level-done">✓</span>}
            </button>
          );
        })}
      </div>
      {onBack && (
        <button type="button" className="pixel-btn back-btn" onClick={onBack}>
          返回
        </button>
      )}
    </div>
  );
}
