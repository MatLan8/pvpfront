import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { GetSessionReportResponse } from "../types/aiReport";

export const useGetSessionReport = (sessionCode: string) => {
  return useQuery<GetSessionReportResponse, Error>({
    queryKey: ["session-report", sessionCode],
    queryFn: async () => {
      const { data } = await axios.get<GetSessionReportResponse>(
        `${import.meta.env.VITE_API_BASE_URL}/api/sessions/${sessionCode}/report`,
      );
      return data;
    },
    enabled: !!sessionCode,
  });
};
