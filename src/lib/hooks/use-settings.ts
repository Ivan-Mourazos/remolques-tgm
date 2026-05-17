"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS } from "@/lib/defaults/default-settings";
import { loadSettings, saveSettings } from "@/lib/storage/local-storage";
import type { AppSettings } from "@/lib/types";

const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getSettingsSnapshot(): AppSettings {
  return loadSettings();
}

function getServerSnapshot(): AppSettings {
  return DEFAULT_SETTINGS;
}

export function useSettings() {
  const settings = useSyncExternalStore(
    subscribe,
    getSettingsSnapshot,
    getServerSnapshot,
  );

  const setSettings = useCallback((next: AppSettings) => {
    saveSettings(next);
    emitChange();
  }, []);

  const ready = typeof window !== "undefined";

  return { settings, setSettings, ready };
}
