import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface LeaderSession {
  sessionId: string;
  sessionCode: string;
  createdAtUtc: string;
  reportCreatedAtUtc: string | null;
  reportId: string | null;
  rawJson: string | null;
}

export const useGetLeaderSessions = (leaderId: string) => {
  return useQuery<LeaderSession[], Error>({
    queryKey: ["leader-sessions", leaderId],

    queryFn: async () => {
      const { data } = await axios.get<LeaderSession[]>(
        `${import.meta.env.VITE_API_BASE_URL}/api/sessions/leader/${leaderId}`,
      );

      return data;
    },

    enabled: !!leaderId,

    refetchInterval: 5000,
  });
};
