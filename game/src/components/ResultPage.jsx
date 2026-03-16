export default function ResultPage({ success, onRetry, onNext, onBack }) {
  return (
    <div className="pixel-page result-page">
      <h1 className={`pixel-title ${success ? "success" : "fail"}`}>
        {success ? "通关！" : "失败"}
      </h1>
      <div className="result-buttons">
        {success && (
          <button type="button" className="pixel-btn primary-btn" onClick={onNext}>
            下一关
          </button>
        )}
        <button type="button" className="pixel-btn" onClick={onRetry}>
          {success ? "重玩" : "重试"}
        </button>
        <button type="button" className="pixel-btn" onClick={onBack}>
          返回关卡
        </button>
      </div>
    </div>
  );
}
