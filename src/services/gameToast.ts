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
