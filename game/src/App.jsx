import { useState } from "react";
import WelcomePage from "./components/WelcomePage";
import LevelSelect from "./components/LevelSelect";
import GamePage from "./components/GamePage";
import ResultPage from "./components/ResultPage";
import { getClearedLevel, setClearedLevel } from "./components/LevelSelect";

export default function App() {
  const [page, setPage] = useState("welcome");
  const [levelId, setLevelId] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [lastResult, setLastResult] = useState({ success: false });

  const handleStart = () => setPage("levels");
  const handleBackToWelcome = () => setPage("welcome");
  const handleSelectLevel = (id) => {
    setLevelId(id);
    setPage("game");
  };
  const handleWin = () => {
    setClearedLevel(levelId + 1);
    setLastResult({ success: true });
    setPage("result");
  };
  const handleLose = () => {
    setLastResult({ success: false });
    setPage("result");
  };
  const handleBackToLevels = () => setPage("levels");
  const handleRetry = () => {
    setRetryKey((k) => k + 1);
    setPage("game");
  };
  const handleNext = () => {
    if (levelId < 5) {
      setLevelId(levelId + 1);
      setPage("game");
    } else {
      setPage("levels");
    }
  };

  return (
    <div className="app-root">
      {page === "welcome" && (
        <WelcomePage onStart={handleStart} />
      )}
      {page === "levels" && (
        <LevelSelect
          onSelect={handleSelectLevel}
          onBack={handleBackToWelcome}
          cleared={getClearedLevel()}
        />
      )}
      {page === "game" && (
        <GamePage
          key={`game-${levelId}-${retryKey}`}
          levelId={levelId}
          onWin={handleWin}
          onLose={handleLose}
          onBack={handleBackToLevels}
          onRetry={handleRetry}
        />
      )}
      {page === "result" && (
        <ResultPage
          success={lastResult.success}
          onRetry={handleRetry}
          onNext={handleNext}
          onBack={handleBackToLevels}
        />
      )}
    </div>
  );
}
