import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export interface UserCreate {
  Email: string;
  DisplayName: string;
  Password: string;
}

export const useRegisterUser = () => {
  return useMutation<string, Error, UserCreate>({
    mutationFn: async (userC: UserCreate) => {
      const { data } = await axios.post<string>(
        `${import.meta.env.VITE_API_BASE_URL}/api/user/register`,
        userC,
      );
      return data;
    },
  });
};
