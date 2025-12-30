import { useSettings } from "@/contexts/SettingsContext";

export function useAutoSync() {
  const { settings, updateSettings } = useSettings();

  const setAutoSyncEnabled = (enabled: boolean) => {
    updateSettings({ autoSyncEnabled: enabled });
  };

  return {
    autoSyncEnabled: settings.autoSyncEnabled,
    setAutoSyncEnabled,
  };
}
