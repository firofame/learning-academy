import type { StudentId } from '../types';

export const ACTIVE_PROFILE_KEY = 'spellbee_active_profile_v1';
export const SETTINGS_KEY = 'spellbee_settings_v1';

export interface AppSettings {
  soundEffects: boolean;
  speechAudio: boolean;
  slowSpeech: boolean;
  paperModeDefault: boolean;
  sessionSize: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEffects: true,
  speechAudio: true,
  slowSpeech: false,
  paperModeDefault: false,
  sessionSize: 5
};

type StorageErrorListener = (message: string) => void;
const storageErrorListeners: StorageErrorListener[] = [];
let pendingStorageError: string | null = null;

export function subscribeStorageError(listener: StorageErrorListener): () => void {
  storageErrorListeners.push(listener);
  if (pendingStorageError) {
    const message = pendingStorageError;
    pendingStorageError = null;
    emitStorageError(message);
  }
  return () => {
    const index = storageErrorListeners.indexOf(listener);
    if (index >= 0) storageErrorListeners.splice(index, 1);
  };
}

export function emitStorageError(message: string): void {
  if (storageErrorListeners.length === 0) pendingStorageError = message;
  storageErrorListeners.forEach(listener => {
    try { listener(message); } catch { /* Keep other listeners active. */ }
  });
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      emitStorageError('Settings file was malformed. Reverted to default settings.');
      return DEFAULT_SETTINGS;
    }
    const value = parsed as Partial<AppSettings>;
    return {
      soundEffects: typeof value.soundEffects === 'boolean' ? value.soundEffects : DEFAULT_SETTINGS.soundEffects,
      speechAudio: typeof value.speechAudio === 'boolean' ? value.speechAudio : DEFAULT_SETTINGS.speechAudio,
      slowSpeech: typeof value.slowSpeech === 'boolean' ? value.slowSpeech : DEFAULT_SETTINGS.slowSpeech,
      paperModeDefault: typeof value.paperModeDefault === 'boolean' ? value.paperModeDefault : DEFAULT_SETTINGS.paperModeDefault,
      sessionSize: typeof value.sessionSize === 'number' && Number.isFinite(value.sessionSize) ? value.sessionSize : DEFAULT_SETTINGS.sessionSize
    };
  } catch {
    emitStorageError('Unable to read settings from browser storage. Using default settings.');
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): boolean {
  if (typeof window === 'undefined') return true;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    emitStorageError('Storage save failed: unable to save settings to browser storage.');
    return false;
  }
}

export function loadActiveStudent(): StudentId {
  if (typeof window === 'undefined') return 'shiza';
  try {
    const saved = localStorage.getItem(ACTIVE_PROFILE_KEY);
    return saved === 'fazia' || saved === 'shiza' ? saved : 'shiza';
  } catch {
    return 'shiza';
  }
}

export function saveActiveStudent(studentId: StudentId): boolean {
  if (typeof window === 'undefined') return true;
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, studentId);
    return true;
  } catch {
    emitStorageError('Storage save failed: unable to remember active student.');
    return false;
  }
}
