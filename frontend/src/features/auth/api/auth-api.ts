import { http } from "@/shared/lib/http";

import type { AuthUser, RegisterInput } from "./types";

export const authApi = {
  async login(email: string, password: string): Promise<AuthUser> {
    const { data } = await http.post<{ user: AuthUser }>("/auth/login/", {
      email,
      password,
    });
    return data.user;
  },

  async register(input: RegisterInput): Promise<AuthUser> {
    const { data } = await http.post<{ user: AuthUser }>("/auth/register/", input);
    return data.user;
  },

  async logout(): Promise<void> {
    await http.post("/auth/logout/");
  },

  async me(): Promise<AuthUser> {
    const { data } = await http.get<AuthUser>("/auth/me/");
    return data;
  },
};
