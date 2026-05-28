import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export type CreateCheckoutRequest = {
  userId: string;
  credits: number;
};

export const useCreateCheckoutSession = () => {
  return useMutation<string, Error, CreateCheckoutRequest>({
    mutationFn: async ({ userId, credits }) => {
      const { data } = await axios.post<string>(
        `${import.meta.env.VITE_API_BASE_URL}/api/payments/checkout`,
        { userId, credits },
      );
      return typeof data === "string" ? data.replace(/^"|"$/g, "") : data;
    },
  });
};
