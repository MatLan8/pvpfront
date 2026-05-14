import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export interface AddCredits {
    Credits: number;
}

export const useAddCredits = (userId: string, options?: { onSuccess?: () => void }) => {
    return useMutation({
        mutationFn: (data: AddCredits) =>
            axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/user/${userId}/AddCredits`, data),
        onSuccess: options?.onSuccess,
    });
};