import { toast } from "react-toastify";
import type { ToastOptions } from "react-toastify";

export type GameToastPayload = {
  variant: "success" | "info" | "warning" | "error";
  message: string;
};

const baseOptions: ToastOptions = {
  position: "bottom-right",
  autoClose: 5000,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: false,
  theme: "dark",
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function pickString(
  o: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string") return v;
  }
  return null;
}

function normalizeVariant(raw: string): GameToastPayload["variant"] {
  const v = raw.trim().toLowerCase();
  if (
    v === "success" ||
    v === "info" ||
    v === "warning" ||
    v === "error"
  ) {
    return v;
  }
  return "error";
}

/** Read variant + message from a GameUiMessage-shaped object (camelCase or PascalCase). */
function readUiMessageBody(o: Record<string, unknown>): {
  variant: GameToastPayload["variant"];
  message: string;
} | null {
  const variantRaw = pickString(o, "variant", "Variant");
  const message = pickString(o, "message", "Message");
  if (variantRaw === null || message === null) return null;
  return { variant: normalizeVariant(variantRaw), message };
}

/**
 * SignalR `ReceiveGameToast` handler: broadcast (UiMessage) vs player-targeted (PrivateUiMessage).
 * When `playerId` is present on the wire, only the matching client sees the toast.
 * When `playerId` is absent but the hub targets a single connection, all recipients may show.
 */
export function handleReceiveGameToastPayload(
  raw: unknown,
  localPlayerId: string,
): void {
  if (!isRecord(raw)) return;

  const nestedPrivate = raw["privateUiMessage"] ?? raw["PrivateUiMessage"];
  if (isRecord(nestedPrivate)) {
    const pidNested = pickString(nestedPrivate, "playerId", "PlayerId");
    let body = readUiMessageBody(nestedPrivate);
    if (body) {
      if (pidNested !== null && pidNested !== localPlayerId) return;
      showGameToast(body);
      return;
    }
    const innerMsg = nestedPrivate["uiMessage"] ?? nestedPrivate["UiMessage"];
    if (isRecord(innerMsg)) {
      body = readUiMessageBody(innerMsg);
      if (body) {
        if (pidNested !== null && pidNested !== localPlayerId) return;
        showGameToast(body);
        return;
      }
    }
  }

  const nestedUi = raw["uiMessage"] ?? raw["UiMessage"];
  if (isRecord(nestedUi)) {
    const body = readUiMessageBody(nestedUi);
    if (body) {
      showGameToast(body);
      return;
    }
  }

  const flatPid = pickString(raw, "playerId", "PlayerId");
  const flatBody = readUiMessageBody(raw);
  if (flatBody && flatPid !== null) {
    if (flatPid !== localPlayerId) return;
    showGameToast(flatBody);
    return;
  }

  if (flatBody) {
    showGameToast(flatBody);
  }
}

export function showGameToast(payload: GameToastPayload) {
  switch (payload.variant) {
    case "success":
      toast.success(payload.message, baseOptions);
      break;
    case "warning":
      toast.warn(payload.message, baseOptions);
      break;
    case "info":
      toast.info(payload.message, baseOptions);
      break;
    case "error":
    default:
      toast.error(payload.message, baseOptions);
      break;
  }
}
