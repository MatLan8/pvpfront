import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export interface SendInvitesRequest {
  sessionCode: string;
  emails: string[];
}

export const useSendInvites = () => {
  return useMutation<void, Error, SendInvitesRequest>({
    mutationFn: async (payload: SendInvitesRequest) => {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/sessions/send-invites`,
        payload,
      );
    },
  });
};
