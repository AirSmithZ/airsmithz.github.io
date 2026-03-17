import { useState, useCallback } from "react";
import Welcome from "./components/Welcome";
import LevelSelect from "./components/LevelSelect";
import MazeGame from "./components/MazeGame";
import Result from "./components/Result";
import "./App.css";
import "./components/PauseMenu.css";

function App() {
  const [page, setPage] = useState("welcome");
  const [clearedLevels, setClearedLevels] = useState(() => {
    try {
      const s = localStorage.getItem("gravity-maze-cleared");
      if (!s) return [];
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameResult, setGameResult] = useState(null);
  const [playTime, setPlayTime] = useState(0);
  const [paused, setPaused] = useState(false);

  const saveCleared = useCallback((levelIds) => {
    setClearedLevels(levelIds);
    try {
      localStorage.setItem("gravity-maze-cleared", JSON.stringify(levelIds));
    } catch {}
  }, []);

  const handleStart = useCallback(() => {
    setPage("levelSelect");
  }, []);

  const handleSelectLevel = useCallback((levelId) => {
    setCurrentLevel(levelId);
    setGameResult(null);
    setPlayTime(0);
    setPage("game");
  }, []);

  const handleBackFromLevels = useCallback(() => {
    setPage("welcome");
  }, []);

  const handleWin = useCallback((timeSeconds) => {
    setGameResult({ success: true, timeSeconds });
    setPlayTime(timeSeconds);
    setPage("result");
    const next = currentLevel + 1;
    if (!clearedLevels.includes(currentLevel)) {
      const updated = [...new Set([...clearedLevels, currentLevel])].sort((a, b) => a - b);
      saveCleared(updated);
    }
  }, [currentLevel, clearedLevels, saveCleared]);

  const handleLose = useCallback((timeSeconds = 0) => {
    setGameResult({ success: false, timeSeconds });
    setPlayTime(timeSeconds);
    setPage("result");
  }, []);

  const handleRetry = useCallback(() => {
    setGameResult(null);
    setPage("game");
  }, []);

  const handleNext = useCallback(() => {
    setCurrentLevel((prev) => prev + 1);
    setGameResult(null);
    setPage("game");
  }, []);

  const handleBackFromGame = useCallback(() => {
    setPage("levelSelect");
  }, []);

  const handlePause = useCallback(() => {
    setPaused(true);
  }, []);

  const handlePauseResume = useCallback(() => {
    setPaused(false);
  }, []);

  const handlePauseRestart = useCallback(() => {
    setPaused(false);
    setGameResult(null);
    setPage("game");
  }, []);

  const handlePauseBack = useCallback(() => {
    setPaused(false);
    setPage("levelSelect");
  }, []);

  if (page === "welcome") {
    return (
      <div className="app app-pixel">
        <Welcome onStart={handleStart} />
      </div>
    );
  }

  if (page === "levelSelect") {
    return (
      <div className="app app-pixel">
        <LevelSelect
          clearedLevels={clearedLevels}
          onSelect={handleSelectLevel}
          onBack={handleBackFromLevels}
        />
      </div>
    );
  }

  if (page === "game" && !paused) {
    return (
      <div className="app app-pixel">
        <MazeGame
          levelId={currentLevel}
          onWin={handleWin}
          onLose={handleLose}
          onPause={handlePause}
        />
      </div>
    );
  }

  if (paused) {
    return (
      <div className="app app-pixel">
        <div className="pause-overlay">
          <div className="pause-menu">
            <h2 className="pause-title">暂停</h2>
            <div className="pause-actions">
              <button type="button" className="pixel-btn" onClick={handlePauseResume}>继续游戏</button>
              <button type="button" className="pixel-btn" onClick={handlePauseRestart}>重新开始</button>
              <button type="button" className="pixel-btn pixel-btn-secondary" onClick={handlePauseBack}>返回关卡列表</button>
            </div>
          </div>
        </div>
        <MazeGame
          levelId={currentLevel}
          onWin={handleWin}
          onLose={handleLose}
          onPause={() => {}}
        />
      </div>
    );
  }

  if (page === "result" && gameResult) {
    return (
      <div className="app app-pixel">
        <Result
          success={gameResult.success}
          timeSeconds={gameResult.timeSeconds}
          levelId={currentLevel}
          onNext={handleNext}
          onRetry={handleRetry}
          onBack={handleBackFromGame}
        />
      </div>
    );
  }

  return null;
}

export default App;
