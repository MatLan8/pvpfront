import axios from "axios";
import { useMutation } from "@tanstack/react-query";

export interface StartSessionRequest {
    LeaderId: string;
}
export interface StartSessionResponse {
    sessionId: string;
    sessionCode: string;
    createdAtUtc: string;
}
export interface ErrorResponse {
    Error: string;
}

export const useStartSession = () => {
    return useMutation<StartSessionResponse, ErrorResponse, StartSessionRequest>({
        mutationFn: async (request: StartSessionRequest):
        Promise<StartSessionResponse> => {
            const response = await axios.post<StartSessionResponse>(
                `${import.meta.env.VITE_API_BASE_URL}/api/sessions/start`,
                request,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            return response.data;
        },
    });
};