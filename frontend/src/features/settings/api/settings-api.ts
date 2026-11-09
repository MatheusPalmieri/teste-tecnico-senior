import type { AuthUser } from "@/features/auth";
import { http } from "@/shared/lib/http";

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  current_password?: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export const settingsApi = {
  async updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
    const { data } = await http.patch<AuthUser>("/auth/me/", input);
    return data;
  },

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await http.post("/auth/change-password/", input);
  },
};
