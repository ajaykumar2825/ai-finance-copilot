import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/auth.store";
import {
  authService,
  SignUpData,
  SignInData,
} from "../services/auth.service";

export function useAuth() {
  const queryClient = useQueryClient();
  const { user, setUser, clearAuth, isAuthenticated } = useAuthStore();

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: async () => {
      const response = await authService.getProfile();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const signUpMutation = useMutation({
    mutationFn: async (data: SignUpData) => {
      const response = await authService.signUp(data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    },
    onSuccess: (response) => {
      if (response.data) {
        localStorage.setItem("access_token", response.data.access_token);
        localStorage.setItem("refresh_token", response.data.refresh_token);
        setUser(response.data.user);
        queryClient.invalidateQueries({ queryKey: ["auth"] });
      }
    },
  });

  const signInMutation = useMutation({
    mutationFn: async (data: SignInData) => {
      const response = await authService.signIn(data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    },
    onSuccess: (response) => {
      if (response.data) {
        localStorage.setItem("access_token", response.data.access_token);
        localStorage.setItem("refresh_token", response.data.refresh_token);
        setUser(response.data.user);
        queryClient.invalidateQueries({ queryKey: ["auth"] });
      }
    },
  });

  const signOutMutation = useMutation({
    mutationFn: () => authService.signOut(),
    onSettled: () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      clearAuth();
      queryClient.clear();
    },
  });

  return {
    user: profile || user,
    isAuthenticated,
    isLoadingProfile,
    signUp: signUpMutation.mutate,
    signIn: signInMutation.mutate,
    signOut: signOutMutation.mutate,
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    signUpError: signUpMutation.error,
    signInError: signInMutation.error,
  };
}