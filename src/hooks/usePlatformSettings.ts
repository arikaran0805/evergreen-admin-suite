import { useCallback, useEffect, useMemo, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export interface LearningExperienceSettings {
  fontSize: number;
  wordWrap: boolean;
  showLineNumbers: boolean;
  highlightActiveLine: boolean;
  showMatchingBrackets: boolean;
}

export interface CodeEditorSettings {
  fontFamily: "default" | "monospace" | "serif";
  tabSize: number;
  indentationType: "spaces" | "tabs";
  fontLigatures: boolean;
}

export interface PracticeModeSettings {
  autoRunOnSave: boolean;
  showSampleTestcasesFirst: boolean;
  errorMessageStyle: "beginner" | "standard";
  revealOutputOnlyAfterRun: boolean;
}

export interface InterviewModeSettings {
  enabled: boolean;
  // These are auto-applied when interview mode is enabled
  preInterviewSettings?: {
    fontSize: number;
    minimap: boolean;
    showHints: boolean;
  };
}

export interface ProductivitySettings {
  keyboardPreset: "beginner" | "vscode" | "vim";
  relativeLineNumbers: boolean;
  minimap: boolean;
  autoFormatOnSubmit: boolean;
}

export interface AdvancedSettings {
  experimentalFeatures: boolean;
  performanceMode: boolean;
}

export interface PlatformSettings {
  learningExperience: LearningExperienceSettings;
  codeEditor: CodeEditorSettings;
  practiceMode: PracticeModeSettings;
  interviewMode: InterviewModeSettings;
  productivity: ProductivitySettings;
  advanced: AdvancedSettings;
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_LEARNING_EXPERIENCE: LearningExperienceSettings = {
  fontSize: 14,
  wordWrap: true,
  showLineNumbers: true,
  highlightActiveLine: true,
  showMatchingBrackets: true,
};

export const DEFAULT_CODE_EDITOR: CodeEditorSettings = {
  fontFamily: "monospace",
  tabSize: 4,
  indentationType: "spaces",
  fontLigatures: false,
};

export const DEFAULT_PRACTICE_MODE: PracticeModeSettings = {
  autoRunOnSave: false,
  showSampleTestcasesFirst: true,
  errorMessageStyle: "beginner",
  revealOutputOnlyAfterRun: false,
};

export const DEFAULT_INTERVIEW_MODE: InterviewModeSettings = {
  enabled: false,
  preInterviewSettings: undefined,
};

export const DEFAULT_PRODUCTIVITY: ProductivitySettings = {
  keyboardPreset: "beginner",
  relativeLineNumbers: false,
  minimap: false,
  autoFormatOnSubmit: false,
};

export const DEFAULT_ADVANCED: AdvancedSettings = {
  experimentalFeatures: false,
  performanceMode: false,
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  learningExperience: DEFAULT_LEARNING_EXPERIENCE,
  codeEditor: DEFAULT_CODE_EDITOR,
  practiceMode: DEFAULT_PRACTICE_MODE,
  interviewMode: DEFAULT_INTERVIEW_MODE,
  productivity: DEFAULT_PRODUCTIVITY,
  advanced: DEFAULT_ADVANCED,
};

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = "unlockmemory-platform-settings";

function loadSettings(): PlatformSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_PLATFORM_SETTINGS;
    const parsed = JSON.parse(saved);
    // Deep merge with defaults to handle new settings
    return {
      learningExperience: { ...DEFAULT_LEARNING_EXPERIENCE, ...(parsed.learningExperience ?? {}) },
      codeEditor: { ...DEFAULT_CODE_EDITOR, ...(parsed.codeEditor ?? {}) },
      practiceMode: { ...DEFAULT_PRACTICE_MODE, ...(parsed.practiceMode ?? {}) },
      interviewMode: { ...DEFAULT_INTERVIEW_MODE, ...(parsed.interviewMode ?? {}) },
      productivity: { ...DEFAULT_PRODUCTIVITY, ...(parsed.productivity ?? {}) },
      advanced: { ...DEFAULT_ADVANCED, ...(parsed.advanced ?? {}) },
    };
  } catch {
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

function saveSettings(settings: PlatformSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

// ============================================================================
// Hook
// ============================================================================

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(loadSettings);

  // Persist on change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Update a specific category
  const updateCategory = useCallback(
    <K extends keyof PlatformSettings>(
      category: K,
      updates: Partial<PlatformSettings[K]>
    ) => {
      setSettings((prev) => ({
        ...prev,
        [category]: { ...prev[category], ...updates },
      }));
    },
    []
  );

  // Enable interview mode (saves current settings, applies interview constraints)
  const enableInterviewMode = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      interviewMode: {
        enabled: true,
        preInterviewSettings: {
          fontSize: prev.learningExperience.fontSize,
          minimap: prev.productivity.minimap,
          showHints: true, // assuming hints were enabled
        },
      },
      // Apply interview constraints
      learningExperience: {
        ...prev.learningExperience,
        fontSize: 14, // Lock font size
      },
      productivity: {
        ...prev.productivity,
        minimap: false, // Disable minimap
      },
      practiceMode: {
        ...prev.practiceMode,
        errorMessageStyle: "standard", // Simplify errors
      },
    }));
  }, []);

  // Disable interview mode (restore previous settings)
  const disableInterviewMode = useCallback(() => {
    setSettings((prev) => {
      const pre = prev.interviewMode.preInterviewSettings;
      return {
        ...prev,
        interviewMode: {
          enabled: false,
          preInterviewSettings: undefined,
        },
        // Restore previous settings if available
        learningExperience: {
          ...prev.learningExperience,
          fontSize: pre?.fontSize ?? prev.learningExperience.fontSize,
        },
        productivity: {
          ...prev.productivity,
          minimap: pre?.minimap ?? prev.productivity.minimap,
        },
      };
    });
  }, []);

  // Toggle interview mode
  const toggleInterviewMode = useCallback(() => {
    setSettings((prev) => {
      if (prev.interviewMode.enabled) {
        // Restore
        const pre = prev.interviewMode.preInterviewSettings;
        return {
          ...prev,
          interviewMode: {
            enabled: false,
            preInterviewSettings: undefined,
          },
          learningExperience: {
            ...prev.learningExperience,
            fontSize: pre?.fontSize ?? prev.learningExperience.fontSize,
          },
          productivity: {
            ...prev.productivity,
            minimap: pre?.minimap ?? prev.productivity.minimap,
          },
        };
      } else {
        // Enable
        return {
          ...prev,
          interviewMode: {
            enabled: true,
            preInterviewSettings: {
              fontSize: prev.learningExperience.fontSize,
              minimap: prev.productivity.minimap,
              showHints: true,
            },
          },
          learningExperience: {
            ...prev.learningExperience,
            fontSize: 14,
          },
          productivity: {
            ...prev.productivity,
            minimap: false,
          },
          practiceMode: {
            ...prev.practiceMode,
            errorMessageStyle: "standard",
          },
        };
      }
    });
  }, []);

  // Reset a specific section
  const resetSection = useCallback((category: keyof PlatformSettings) => {
    const defaults: Record<keyof PlatformSettings, unknown> = {
      learningExperience: DEFAULT_LEARNING_EXPERIENCE,
      codeEditor: DEFAULT_CODE_EDITOR,
      practiceMode: DEFAULT_PRACTICE_MODE,
      interviewMode: DEFAULT_INTERVIEW_MODE,
      productivity: DEFAULT_PRODUCTIVITY,
      advanced: DEFAULT_ADVANCED,
    };
    setSettings((prev) => ({
      ...prev,
      [category]: defaults[category],
    }));
  }, []);

  // Reset all settings
  const resetAll = useCallback(() => {
    setSettings(DEFAULT_PLATFORM_SETTINGS);
  }, []);

  // Computed Monaco editor options
  const monacoOptions = useMemo(() => {
    const { learningExperience, codeEditor, productivity, interviewMode } = settings;
    
    const fontFamilyMap: Record<string, string> = {
      default: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      monospace: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      serif: "'Georgia', 'Times New Roman', serif",
    };

    return {
      fontSize: learningExperience.fontSize,
      wordWrap: learningExperience.wordWrap ? "on" : "off",
      lineNumbers: productivity.relativeLineNumbers 
        ? "relative" 
        : (learningExperience.showLineNumbers ? "on" : "off"),
      renderLineHighlight: learningExperience.highlightActiveLine ? "line" : "none",
      matchBrackets: learningExperience.showMatchingBrackets ? "always" : "never",
      fontFamily: fontFamilyMap[codeEditor.fontFamily] || fontFamilyMap.default,
      tabSize: codeEditor.tabSize,
      insertSpaces: codeEditor.indentationType === "spaces",
      fontLigatures: codeEditor.fontLigatures,
      minimap: { enabled: productivity.minimap && !interviewMode.enabled },
    };
  }, [settings]);

  return useMemo(
    () => ({
      settings,
      updateCategory,
      enableInterviewMode,
      disableInterviewMode,
      toggleInterviewMode,
      resetSection,
      resetAll,
      monacoOptions,
    }),
    [settings, updateCategory, enableInterviewMode, disableInterviewMode, toggleInterviewMode, resetSection, resetAll, monacoOptions]
  );
}

export type PlatformSettingsReturn = ReturnType<typeof usePlatformSettings>;
