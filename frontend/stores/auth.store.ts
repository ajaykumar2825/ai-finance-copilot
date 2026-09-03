import { create } from "zustand";
import { User } from "../types";

interface AuthState {
  user: User | null;
  session: {
    accessToken: string | null;
    refreshToken: string | null;
  } | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setSession: (
    accessToken: string,
    refreshToken: string
  ) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isAuthenticated:
    typeof window !== "undefined" &&
    !!localStorage.getItem("access_token"),
  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
    }),
  setSession: (accessToken, refreshToken) =>
    set({
      session: {
        accessToken,
        refreshToken,
      },
      isAuthenticated: true,
    }),
  clearAuth: () =>
    set({
      user: null,
      session: null,
      isAuthenticated: false,
    }),
}));