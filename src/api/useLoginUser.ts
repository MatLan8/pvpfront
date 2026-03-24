import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export interface LoginRequest {
  Email: string;
  Password: string;
}

export interface LoginResponse {
  id: string;
}

export const useLoginUser = () => {
  return useMutation<LoginResponse, any, LoginRequest>({
    mutationFn: async (loginData: LoginRequest) => {
      const { data } = await axios.post<LoginResponse>(
        `${import.meta.env.VITE_API_BASE_URL}/api/user/login`,
        loginData,
      );
      return data;
    },
  });
};
