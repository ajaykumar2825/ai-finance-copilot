import { api } from "./api";
import { UserSettings } from "../types";

export interface UpdateSettingsData {
  theme?: "light" | "dark" | "system";
  language?: string;
  llmProvider?: string;
  embeddingProvider?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    priceAlerts?: boolean;
    newsAlerts?: boolean;
  };
}

export const settingsService = {
  async getSettings() {
    return api.get<UserSettings>("/settings");
  },

  async updateSettings(data: UpdateSettingsData) {
    return api.put<UserSettings>("/settings", data);
  },
};