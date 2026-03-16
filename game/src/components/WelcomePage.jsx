export default function WelcomePage({ onStart }) {
  return (
    <div className="pixel-page welcome-page">
      <h1 className="pixel-title">重力迷宫</h1>
      <p className="pixel-subtitle">翻转重力，滚到终点</p>
      <button type="button" className="pixel-btn primary-btn" onClick={onStart}>
        开始游戏
      </button>
    </div>
  );
}
