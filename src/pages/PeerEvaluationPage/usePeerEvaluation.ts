import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface Player {
  playerId: string;
  nickname: string;
  isConnected?: boolean;
}

interface PeerEvaluationStatus {
  totalPlayers: number;
  submittedCount: number;
  submittedPlayerIds: string[];
  allSubmitted: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function usePeerEvaluationData(sessionCode: string) {
  const playerId = sessionStorage.getItem("playerId")!;

  // Fetch status (who has submitted)
  const statusQuery = useQuery({
    queryKey: ["peer-evaluation-status", sessionCode],
    queryFn: async () => {
      const { data } = await axios.get<PeerEvaluationStatus>(
        `${API_BASE}/api/sessions/${sessionCode}/peer-evaluations-status`,
      );
      return data;
    },
    enabled: !!sessionCode,
    refetchInterval: 3000,
  });

  // Fetch players from session state
  const playersQuery = useQuery({
    queryKey: ["peer-evaluation-players", sessionCode],
    queryFn: async () => {
      // Try to get players from the session's current state
      const { data } = await axios.get<{ players: Player[] }>(
        `${API_BASE}/api/sessions/${sessionCode}/players`,
      );
      return data.players;
    },
    enabled: !!sessionCode,
    retry: false, // Don't retry if session is gone
  });

  const players = playersQuery.data || [];
  const otherPlayers = players.filter((p: Player) => p.playerId !== playerId);

  return {
    playerId,
    players,
    otherPlayers,
    status: statusQuery.data,
    isLoading: statusQuery.isLoading || playersQuery.isLoading,
    error: statusQuery.error || playersQuery.error,
    refetchStatus: () => queryClient.invalidateQueries({ queryKey: ["peer-evaluation-status", sessionCode] }),
  };
}