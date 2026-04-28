import { GameSessionProvider, useGameSessionContext } from "../contexts/GameSessionContext";
import ConnectionsGamePage from "./Connections/ConnectionsGamePage";
import LasersGamePage from "./Lasers/LasersGamePage";
import WordleGamePage from "./Wordle/WordleGamePage";

function GameSessionSwitch() {
  const { publicState, error } = useGameSessionContext();

  const hasStarted = publicState?.hasStarted === true;
  const game = publicState?.game as Record<string, unknown> | null | undefined;
  const gameType =
    typeof game?.GameType === "string"
      ? game.GameType
      : typeof game?.gameType === "string"
        ? game.gameType
        : undefined;

  if (!hasStarted) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e2e8f0",
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        Waiting for the game to start.
      </div>
    );
  }

  if (!game) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        Loading game…
      </div>
    );
  }

  if (gameType === "Lasers") {
    return <LasersGamePage />;
  }

  if (gameType === "Connections") {
    return <ConnectionsGamePage />;
  }

  if (gameType === "Wordle") {
    return <WordleGamePage />;
  }

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        color: "#f87171",
        fontSize: 18,
        fontWeight: 600,
        padding: 24,
      }}
    >
      <p>Unknown or unsupported game type: {String(gameType ?? "undefined")}</p>
      {error ? <p style={{ color: "#94a3b8", fontSize: 14 }}>{error}</p> : null}
    </div>
  );
}

export default function GameSessionRouter() {
  return (
    <GameSessionProvider>
      <GameSessionSwitch />
    </GameSessionProvider>
  );
}
