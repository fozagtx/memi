import "expo-sqlite/localStorage/install";

import { useSyncExternalStore } from "react";

import type { AppSettings } from "../types";

const SETTINGS_KEY = "memi.settings.v2";

export const defaultSettings: AppSettings = {
  tone: "chaotic",
};

type Listener = () => void;

const listeners = new Set<Listener>();
let cachedRawSettings: string | null | undefined;
let cachedSettings: AppSettings = defaultSettings;

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function getSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) {
      cachedRawSettings = saved;
      cachedSettings = defaultSettings;
      return cachedSettings;
    }

    if (saved === cachedRawSettings) {
      return cachedSettings;
    }

    cachedRawSettings = saved;
    cachedSettings = { ...defaultSettings, ...JSON.parse(saved) };
    return cachedSettings;
  } catch {
    cachedRawSettings = undefined;
    cachedSettings = defaultSettings;
    return cachedSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  const rawSettings = JSON.stringify(settings);
  cachedRawSettings = rawSettings;
  cachedSettings = { ...defaultSettings, ...settings };
  localStorage.setItem(SETTINGS_KEY, rawSettings);
  notify();
}

export function useSettings(): [AppSettings, (settings: AppSettings) => void] {
  const settings = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSettings,
    getSettings,
  );

  return [settings, saveSettings];
}
