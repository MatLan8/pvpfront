import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export type ConfirmPaymentResponse = {
  remainingCredits: number;
};

export const useConfirmStripePayment = () => {
  return useMutation<ConfirmPaymentResponse, Error, string>({
    mutationFn: async (sessionId) => {
      const { data } = await axios.post<ConfirmPaymentResponse>(
        `${import.meta.env.VITE_API_BASE_URL}/api/payments/confirm`,
        sessionId,
        { headers: { "Content-Type": "application/json" } },
      );
      return data;
    },
  });
};
