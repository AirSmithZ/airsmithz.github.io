import "./Result.css";

function Result({ success, timeSeconds, levelId, onNext, onRetry, onBack }) {
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="result-overlay">
      <div className="result-dialog">
        <h2 className={`result-title ${success ? "success" : "fail"}`}>
          {success ? "通关！" : "失败"}
        </h2>
        <p className="result-time">用时 {formatTime(timeSeconds)}</p>
        <div className="result-actions">
          {success && levelId < 6 && (
            <button className="pixel-btn" onClick={onNext}>
              下一关
            </button>
          )}
          <button className="pixel-btn" onClick={onRetry}>
            {success && levelId < 6 ? "重玩" : "重试"}
          </button>
          <button className="pixel-btn pixel-btn-secondary" onClick={onBack}>
            返回
          </button>
        </div>
      </div>
    </div>
  );
}

export default Result;
