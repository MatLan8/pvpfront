import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { GetSessionReportResponse } from "../types/aiReport";
import {
  isReportPending,
  SESSION_REPORT_MAX_RETRIES,
  SESSION_REPORT_POLL_INTERVAL_MS,
} from "./sessionReportUtils";

export const sessionReportQueryKey = (sessionCode: string) =>
  ["session-report", sessionCode] as const;

export const useGetSessionReport = (sessionCode: string) => {
  return useQuery<GetSessionReportResponse, Error>({
    queryKey: sessionReportQueryKey(sessionCode),
    queryFn: async () => {
      const { data } = await axios.get<GetSessionReportResponse>(
        `${import.meta.env.VITE_API_BASE_URL}/api/sessions/${sessionCode}/report`,
      );
      return data;
    },
    enabled: !!sessionCode,
    retry: (failureCount, error) =>
      isReportPending(error) && failureCount < SESSION_REPORT_MAX_RETRIES,
    retryDelay: SESSION_REPORT_POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });
};
export { isReportPending } from "./sessionReportUtils";
