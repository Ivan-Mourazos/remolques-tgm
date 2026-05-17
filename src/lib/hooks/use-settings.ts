"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS } from "@/lib/defaults/default-settings";
import { loadSettings, saveSettings } from "@/lib/storage/local-storage";
import type { AppSettings } from "@/lib/types";

const listeners = new Set<() => void>();
let cachedSettings: AppSettings = DEFAULT_SETTINGS;
let settingsLoaded = false;
let loadQueued = false;

function loadClientSettings() {
  cachedSettings = loadSettings();
  settingsLoaded = true;
  loadQueued = false;
  emitChange();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (typeof window !== "undefined" && !settingsLoaded && !loadQueued) {
    loadQueued = true;
    queueMicrotask(loadClientSettings);
  }
  return () => listeners.delete(onStoreChange);
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getSettingsSnapshot(): AppSettings {
  return cachedSettings;
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
    cachedSettings = next;
    settingsLoaded = true;
    saveSettings(next);
    emitChange();
  }, []);

  const ready = settingsLoaded;

  return { settings, setSettings, ready };
}
