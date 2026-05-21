import { useGetSessionReport } from "../api/useGetSessionReport";
import { isReportPending } from "../api/sessionReportUtils";

/**
 * Wraps useGetSessionReport for report pages:
 * - keeps showing loading while AI report is pending (404 + retries)
 * - only surfaces a hard error for real failures or retry exhaustion
 */
export function useSessionReportPage(sessionCode: string) {
  const query = useGetSessionReport(sessionCode);

  const { data, error, isFetching, isPending, isError, failureCount } = query;

  const pendingExhausted =
    isError && !!error && isReportPending(error) && failureCount >= 30; // keep in sync with SESSION_REPORT_MAX_RETRIES

  const isReportLoading =
    !!sessionCode &&
    !data &&
    (isPending ||
      isFetching ||
      (!!error && isReportPending(error) && !pendingExhausted));

  const isReportError =
    !!sessionCode &&
    !data &&
    !!error &&
    (!isReportPending(error) || pendingExhausted);

  return {
    ...query,
    isReportLoading,
    isReportError,
    pendingExhausted,
  };
}
