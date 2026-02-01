import { useCallback, useEffect, useMemo, useState } from "react";

export interface PracticeEditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
}

const STORAGE_KEY = "code-editor-settings";

const DEFAULT_SETTINGS: PracticeEditorSettings = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: true,
  minimap: false,
  lineNumbers: true,
};

function loadSettings(): PracticeEditorSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(saved);
    return { ...DEFAULT_SETTINGS, ...(parsed ?? {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function usePracticeEditorSettings() {
  const [settings, setSettings] = useState<PracticeEditorSettings>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const updateSetting = useCallback(
    <K extends keyof PracticeEditorSettings>(
      key: K,
      value: PracticeEditorSettings[K],
    ) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return useMemo(
    () => ({ settings, updateSetting, defaults: DEFAULT_SETTINGS }),
    [settings, updateSetting],
  );
}
