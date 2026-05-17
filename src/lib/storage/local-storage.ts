"use client";

import {
  DEFAULT_MATERIALS,
  DEFAULT_OLLAO_TEMPLATES,
  DEFAULT_SETTINGS,
} from "@/lib/defaults/default-settings";
import type {
  AppSettings,
  MaterialItem,
  OllaoTemplate,
  SavedItem,
} from "@/lib/types";

const KEYS = {
  settings: "remolques-tgm:settings",
  history: "remolques-tgm:history",
  materials: "remolques-tgm:materials",
  ollaoTemplates: "remolques-tgm:ollao-templates",
} as const;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadSettings(): AppSettings {
  return readJson(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  writeJson(KEYS.settings, settings);
}

export function loadHistory(): SavedItem[] {
  return readJson<SavedItem[]>(KEYS.history, []);
}

export function saveHistory(items: SavedItem[]): void {
  writeJson(KEYS.history, items);
}

export function addToHistory(item: SavedItem): void {
  const history = loadHistory();
  saveHistory([item, ...history]);
}

export function updateHistoryItem(item: SavedItem): void {
  const history = loadHistory().map((h) => (h.id === item.id ? item : h));
  saveHistory(history);
}

export function deleteHistoryItem(id: string): void {
  saveHistory(loadHistory().filter((h) => h.id !== id));
}

export function getHistoryItem(id: string): SavedItem | undefined {
  return loadHistory().find((h) => h.id === id);
}

export function loadMaterials(): MaterialItem[] {
  return readJson(KEYS.materials, DEFAULT_MATERIALS);
}

export function saveMaterials(materials: MaterialItem[]): void {
  writeJson(KEYS.materials, materials);
}

export function loadOllaoTemplates(): OllaoTemplate[] {
  return readJson(KEYS.ollaoTemplates, DEFAULT_OLLAO_TEMPLATES);
}

export function saveOllaoTemplates(templates: OllaoTemplate[]): void {
  writeJson(KEYS.ollaoTemplates, templates);
}

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
