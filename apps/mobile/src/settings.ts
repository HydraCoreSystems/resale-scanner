import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_SETTINGS, type VerdictSettings } from "@rs/core";
import { useCallback, useEffect, useState } from "react";

const KEY = "verdict-settings-v1";

export async function loadSettings(): Promise<VerdictSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<VerdictSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: VerdictSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

export function useVerdictSettings() {
  const [settings, setSettings] = useState<VerdictSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void loadSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);
  const update = useCallback(async (next: VerdictSettings) => {
    setSettings(next);
    await saveSettings(next);
  }, []);
  return { settings, loaded, update };
}
