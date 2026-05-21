import { AxiosError } from "axios";

export type SessionReportPendingResponse = {
  status: "pending";
  sessionCode: string;
  message: string;
};

const PENDING_STATUSES = new Set([404]);

/** True when the session exists but the AI report is not in the DB yet. */
export function isReportPending(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false;

  const status = error.response?.status;
  if (!status || !PENDING_STATUSES.has(status)) return false;

  const data = error.response?.data as
    | SessionReportPendingResponse
    | { error?: string; Error?: string }
    | undefined;

  if (data && typeof data === "object" && "status" in data) {
    return (
      String((data as SessionReportPendingResponse).status).toLowerCase() ===
      "pending"
    );
  }

  // Legacy backend (400) until you deploy 404 pending
  const legacyMessage = data?.error ?? data?.Error ?? "";
  return legacyMessage.includes("AI report not found");
}

export const SESSION_REPORT_POLL_INTERVAL_MS = 2000;
export const SESSION_REPORT_MAX_RETRIES = 30; // ~60s at 2s interval
