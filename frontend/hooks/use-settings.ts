import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  settingsService,
  UpdateSettingsData,
} from "../services/settings.service";

export function useSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await settingsService.getSettings();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: UpdateSettingsData) => settingsService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  return {
    settings,
    isLoadingSettings,
    updateSettings: updateSettingsMutation.mutate,
    isUpdatingSettings: updateSettingsMutation.isPending,
  };
}