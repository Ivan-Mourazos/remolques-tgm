"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "@/lib/defaults/default-settings";
import { loadSettings, saveSettings } from "@/lib/storage/local-storage";
import type { AppSettings } from "@/lib/types";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setReady(true);
  }, []);

  const persist = useCallback((next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  return { settings, setSettings: persist, ready };
}
