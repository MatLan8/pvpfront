import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface User {
    displayName: string;
    remainingCredits: number;
}

export const useGetUser = (userId: string) => {
    return useQuery<User, Error>({
        queryKey: ["user", userId], 
        queryFn: async () => {
            const { data } = await axios.get<User>(
                `${import.meta.env.VITE_API_BASE_URL}/api/user/${userId}/getUser`
            );
            return data;
        },
    });
};