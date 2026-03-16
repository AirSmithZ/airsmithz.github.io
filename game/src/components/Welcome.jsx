import "./Welcome.css";

export default function Welcome({ onStart }) {
  return (
    <div className="welcome">
      <h1 className="welcome-title">重力迷宫</h1>
      <p className="welcome-sub">Gravity Maze</p>
      <button type="button" className="pixel-btn pixel-btn-primary" onClick={onStart}>
        开始游戏
      </button>
    </div>
  );
}
