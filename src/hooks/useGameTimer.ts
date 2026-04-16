import { useCallback, useEffect, useState } from "react";
import { startConnection } from "../services/signalr";

type TimerUpdatedPayload = {
  remainingSeconds?: number;
  RemainingSeconds?: number;
  timerStartedAtUtc?: string;
  TimerStartedAtUtc?: string;
  timerEndsAtUtc?: string;
  TimerEndsAtUtc?: string;
};

export type UseGameTimerParams = {
  sessionCode: string | undefined;
  hasStarted: boolean;
  isGameRunning: boolean;
  publicState: {
    remainingSeconds?: number;
    RemainingSeconds?: number;
    timerStartedAtUtc?: string;
    TimerStartedAtUtc?: string;
    timerEndsAtUtc?: string;
    TimerEndsAtUtc?: string;
  } | null;
  setError: React.Dispatch<React.SetStateAction<string>>;
};

export type UseGameTimerResult = {
  timerRemainingSeconds: number | null;
  timerStartedAtUtc: string | null;
  timerEndsAtUtc: string | null;
  hasTimedOut: boolean;
  isGameTimeOver: boolean;
  handleTimerExpired: () => void;
};

export function useGameTimer({
  sessionCode,
  hasStarted,
  isGameRunning,
  publicState,
  setError,
}: UseGameTimerParams): UseGameTimerResult {
  const [isGameTimeOver, setGameTimeOver] = useState(false);

  const [serverRemainingSeconds, setServerRemainingSeconds] = useState<
    number | null
  >(null);
  const [serverTimerStartedAtUtc, setServerTimerStartedAtUtc] = useState<
    string | null
  >(null);
  const [serverTimerEndsAtUtc, setServerTimerEndsAtUtc] = useState<
    string | null
  >(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const timerRemainingSecondsFromState =
    publicState?.remainingSeconds ?? publicState?.RemainingSeconds ?? null;

  const timerStartedAtUtcFromState =
    publicState?.timerStartedAtUtc ?? publicState?.TimerStartedAtUtc ?? null;

  const timerEndsAtUtcFromState =
    publicState?.timerEndsAtUtc ?? publicState?.TimerEndsAtUtc ?? null;

  const timerRemainingSeconds =
    serverRemainingSeconds ?? timerRemainingSecondsFromState;

  const timerStartedAtUtc =
    serverTimerStartedAtUtc ?? timerStartedAtUtcFromState;

  const timerEndsAtUtc = serverTimerEndsAtUtc ?? timerEndsAtUtcFromState;

  const fetchRemainingTime = useCallback(async () => {
    if (!sessionCode || !hasStarted || !isGameRunning) return;

    try {
      const connection = await startConnection();
      const remaining = await connection.invoke(
        "GetRemainingTime",
        sessionCode,
      );

      if (typeof remaining === "number") {
        const safeRemaining = Math.max(0, remaining);
        setServerRemainingSeconds(safeRemaining);

        if (safeRemaining <= 0) {
          setHasTimedOut(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [sessionCode, hasStarted, isGameRunning]);

  const handleTimerExpired = useCallback(() => {
    setHasTimedOut(true);
    setServerRemainingSeconds(0);
    setError("Time is up. Waiting for the server to finalize the match.");
  }, [setError]);

  useEffect(() => {
    if (isGameRunning) {
      setGameTimeOver(false);
    }
  }, [isGameRunning]);

  useEffect(() => {
    if (!hasStarted) {
      setHasTimedOut(false);
      setGameTimeOver(false);
      setServerRemainingSeconds(null);
      setServerTimerStartedAtUtc(null);
      setServerTimerEndsAtUtc(null);
      return;
    }

    if (!isGameRunning) {
      setHasTimedOut(false);
    }
  }, [hasStarted, isGameRunning]);

  useEffect(() => {
    if (!sessionCode) return;

    let isMounted = true;
    let dispose: (() => void) | undefined;

    const bindRealtimeEvents = async () => {
      try {
        const connection = await startConnection();

        const handleTimerUpdated = (payload: TimerUpdatedPayload) => {
          if (!isMounted) return;

          const nextRemaining =
            payload?.remainingSeconds ?? payload?.RemainingSeconds ?? null;
          const nextStartedAt =
            payload?.timerStartedAtUtc ?? payload?.TimerStartedAtUtc ?? null;
          const nextEndsAt =
            payload?.timerEndsAtUtc ?? payload?.TimerEndsAtUtc ?? null;

          if (typeof nextRemaining === "number") {
            const safeRemaining = Math.max(0, nextRemaining);
            setServerRemainingSeconds(safeRemaining);

            if (safeRemaining <= 0) {
              setHasTimedOut(true);
            }
          }

          if (typeof nextStartedAt === "string") {
            setServerTimerStartedAtUtc(nextStartedAt);
          }

          if (typeof nextEndsAt === "string") {
            setServerTimerEndsAtUtc(nextEndsAt);
          }
        };

        const handleGameTimedOut = () => {
          if (!isMounted) return;
          setHasTimedOut(true);
          setServerRemainingSeconds(0);
          setGameTimeOver(true);
          setError("Time is up. Game finished.");
        };

        const handleGameCompleted = () => {
          if (!isMounted) return;
          setHasTimedOut(false);
        };

        const handleGameFailed = () => {
          if (!isMounted) return;
          setHasTimedOut(false);
        };

        connection.off("TimerUpdated");
        connection.off("GameTimedOut");
        connection.off("GameCompleted");
        connection.off("GameFailed");

        connection.on("TimerUpdated", handleTimerUpdated);
        connection.on("GameTimedOut", handleGameTimedOut);
        connection.on("GameCompleted", handleGameCompleted);
        connection.on("GameFailed", handleGameFailed);

        dispose = () => {
          connection.off("TimerUpdated", handleTimerUpdated);
          connection.off("GameTimedOut", handleGameTimedOut);
          connection.off("GameCompleted", handleGameCompleted);
          connection.off("GameFailed", handleGameFailed);
        };
      } catch (err) {
        console.error(err);
      }
    };

    void bindRealtimeEvents();

    return () => {
      isMounted = false;
      dispose?.();
    };
  }, [sessionCode, setError]);

  useEffect(() => {
    if (!hasStarted || !isGameRunning) return;

    void fetchRemainingTime();

    const intervalId = window.setInterval(() => {
      void fetchRemainingTime();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasStarted, isGameRunning, fetchRemainingTime]);

  return {
    timerRemainingSeconds,
    timerStartedAtUtc,
    timerEndsAtUtc,
    hasTimedOut,
    isGameTimeOver,
    handleTimerExpired,
  };
}
