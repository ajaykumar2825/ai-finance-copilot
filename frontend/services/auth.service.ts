import { api } from "./api";
import { User } from "../types";

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export const authService = {
  async signUp(data: SignUpData) {
    return api.post<AuthResponse>("/auth/signup", data);
  },

  async signIn(data: SignInData) {
    return api.post<AuthResponse>("/auth/signin", data);
  },

  async signOut() {
    return api.post("/auth/signout");
  },

  async refreshSession(refreshToken: string) {
    return api.post<AuthResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });
  },

  async getProfile() {
    return api.get<User>("/auth/profile");
  },
};