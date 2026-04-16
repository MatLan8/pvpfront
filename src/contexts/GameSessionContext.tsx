import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useParams } from "react-router-dom";
import { useGameSession } from "../hooks/useGameSession";
import type { BasePublicState } from "../types/gameSession";

export type GameSessionContextValue = {
  publicState: BasePublicState<unknown> | null;
  privateData: unknown | null;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
};

const GameSessionContext = createContext<GameSessionContextValue | null>(null);

export function GameSessionProvider({ children }: { children: ReactNode }) {
  const { sessionCode } = useParams();
  const nickname = sessionStorage.getItem("nickname");
  const playerId = sessionStorage.getItem("playerId");

  const { publicState, privateData, error, setError } = useGameSession<
    BasePublicState<unknown>,
    unknown
  >({
    sessionCode,
    nickname,
    playerId,
  });

  const value: GameSessionContextValue = {
    publicState,
    privateData,
    error,
    setError,
  };

  return (
    <GameSessionContext.Provider value={value}>
      {children}
    </GameSessionContext.Provider>
  );
}

export function useGameSessionContext(): GameSessionContextValue {
  const ctx = useContext(GameSessionContext);
  if (ctx == null) {
    throw new Error(
      "useGameSessionContext must be used within a GameSessionProvider",
    );
  }
  return ctx;
}
