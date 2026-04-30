export type PublicPlayer = {
  playerId: string;
  nickname: string;
  isConnected: boolean;
};

export type BasePublicState<TGame> = {
  sessionCode: string;
  playerCount: number;
  players: PublicPlayer[];
  hasStarted: boolean;
  remainingSeconds?: number;
  RemainingSeconds?: number;
  timerStartedAtUtc?: string;
  TimerStartedAtUtc?: string;
  timerEndsAtUtc?: string;
  TimerEndsAtUtc?: string;
  totalRounds?: number;
  roundIndex?: number;
  game: TGame | null;
};
