import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  X,
  BookOpen,
  Code2,
  Target,
  Timer,
  Zap,
  Cog,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import {
  usePlatformSettings,
  DEFAULT_LEARNING_EXPERIENCE,
  DEFAULT_CODE_EDITOR,
  DEFAULT_PRACTICE_MODE,
  DEFAULT_INTERVIEW_MODE,
  DEFAULT_PRODUCTIVITY,
  DEFAULT_ADVANCED,
} from "@/hooks/usePlatformSettings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ============================================================================
// Types
// ============================================================================

type SettingsCategory =
  | "learning"
  | "editor"
  | "practice"
  | "interview"
  | "productivity"
  | "advanced";

interface PlatformSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Sidebar Categories
// ============================================================================

const categories: {
  id: SettingsCategory;
  label: string;
  icon: typeof BookOpen;
  description: string;
}[] = [
  {
    id: "learning",
    label: "Learning Experience",
    icon: BookOpen,
    description: "Optimize readability and reduce visual fatigue",
  },
  {
    id: "editor",
    label: "Code Editor",
    icon: Code2,
    description: "Configure your coding environment",
  },
  {
    id: "practice",
    label: "Practice Mode",
    icon: Target,
    description: "Customize your daily problem-solving workflow",
  },
  {
    id: "interview",
    label: "Interview Mode",
    icon: Timer,
    description: "Simulate real interview conditions",
  },
  {
    id: "productivity",
    label: "Productivity",
    icon: Zap,
    description: "Speed up your coding workflow",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: Cog,
    description: "Power user settings and reset options",
  },
];

// ============================================================================
// Setting Row Component
// ============================================================================

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function SettingRow({ label, description, children, disabled }: SettingRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 border-b border-border/50 last:border-0",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex-1 pr-4">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ============================================================================
// Section Components
// ============================================================================

function LearningExperienceSection({
  settings,
  updateCategory,
  disabled,
}: {
  settings: ReturnType<typeof usePlatformSettings>["settings"];
  updateCategory: ReturnType<typeof usePlatformSettings>["updateCategory"];
  disabled?: boolean;
}) {
  const { learningExperience } = settings;

  return (
    <div className="space-y-1">
      <SettingRow
        label="Font Size"
        description="Larger text reduces eye strain during long sessions"
        disabled={disabled}
      >
        <Select
          value={String(learningExperience.fontSize)}
          onValueChange={(v) =>
            updateCategory("learningExperience", { fontSize: Number(v) })
          }
          disabled={disabled}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12">12px</SelectItem>
            <SelectItem value="14">14px</SelectItem>
            <SelectItem value="16">16px</SelectItem>
            <SelectItem value="18">18px</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Word Wrap"
        description="Prevent horizontal scrolling on long lines"
        disabled={disabled}
      >
        <Switch
          checked={learningExperience.wordWrap}
          onCheckedChange={(v) =>
            updateCategory("learningExperience", { wordWrap: v })
          }
          disabled={disabled}
        />
      </SettingRow>

      <SettingRow
        label="Show Line Numbers"
        description="Helps with debugging and code references"
        disabled={disabled}
      >
        <Switch
          checked={learningExperience.showLineNumbers}
          onCheckedChange={(v) =>
            updateCategory("learningExperience", { showLineNumbers: v })
          }
          disabled={disabled}
        />
      </SettingRow>

      <SettingRow
        label="Highlight Active Line"
        description="Keep track of your cursor position"
        disabled={disabled}
      >
        <Switch
          checked={learningExperience.highlightActiveLine}
          onCheckedChange={(v) =>
            updateCategory("learningExperience", { highlightActiveLine: v })
          }
          disabled={disabled}
        />
      </SettingRow>

      <SettingRow
        label="Show Matching Brackets"
        description="Easier to track nested code blocks"
        disabled={disabled}
      >
        <Switch
          checked={learningExperience.showMatchingBrackets}
          onCheckedChange={(v) =>
            updateCategory("learningExperience", { showMatchingBrackets: v })
          }
          disabled={disabled}
        />
      </SettingRow>
    </div>
  );
}

function CodeEditorSection({
  settings,
  updateCategory,
}: {
  settings: ReturnType<typeof usePlatformSettings>["settings"];
  updateCategory: ReturnType<typeof usePlatformSettings>["updateCategory"];
}) {
  const { codeEditor } = settings;

  return (
    <div className="space-y-1">
      <SettingRow
        label="Font Family"
        description="Choose a font that's comfortable for coding"
      >
        <Select
          value={codeEditor.fontFamily}
          onValueChange={(v: "default" | "monospace" | "serif") =>
            updateCategory("codeEditor", { fontFamily: v })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="monospace">Monospace</SelectItem>
            <SelectItem value="serif">Serif</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Tab Size"
        description="Number of spaces per indentation level"
      >
        <Select
          value={String(codeEditor.tabSize)}
          onValueChange={(v) =>
            updateCategory("codeEditor", { tabSize: Number(v) })
          }
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 spaces</SelectItem>
            <SelectItem value="4">4 spaces</SelectItem>
            <SelectItem value="8">8 spaces</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Indentation Type"
        description="Spaces are more consistent across editors"
      >
        <Select
          value={codeEditor.indentationType}
          onValueChange={(v: "spaces" | "tabs") =>
            updateCategory("codeEditor", { indentationType: v })
          }
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spaces">Spaces</SelectItem>
            <SelectItem value="tabs">Tabs</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Font Ligatures"
        description="Combine characters like => into single symbols"
      >
        <Switch
          checked={codeEditor.fontLigatures}
          onCheckedChange={(v) =>
            updateCategory("codeEditor", { fontLigatures: v })
          }
        />
      </SettingRow>
    </div>
  );
}

function PracticeModeSection({
  settings,
  updateCategory,
}: {
  settings: ReturnType<typeof usePlatformSettings>["settings"];
  updateCategory: ReturnType<typeof usePlatformSettings>["updateCategory"];
}) {
  const { practiceMode } = settings;

  return (
    <div className="space-y-1">
      <SettingRow
        label="Auto-run on Save"
        description="Automatically run tests when you save (Ctrl+S)"
      >
        <Switch
          checked={practiceMode.autoRunOnSave}
          onCheckedChange={(v) =>
            updateCategory("practiceMode", { autoRunOnSave: v })
          }
        />
      </SettingRow>

      <SettingRow
        label="Show Sample Test Cases First"
        description="Display example inputs before your custom tests"
      >
        <Switch
          checked={practiceMode.showSampleTestcasesFirst}
          onCheckedChange={(v) =>
            updateCategory("practiceMode", { showSampleTestcasesFirst: v })
          }
        />
      </SettingRow>

      <SettingRow
        label="Error Message Style"
        description="Controls how error messages are displayed"
      >
        <Select
          value={practiceMode.errorMessageStyle}
          onValueChange={(v: "beginner" | "standard" | "advanced") =>
            updateCategory("practiceMode", { errorMessageStyle: v })
          }
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Reveal Output Only After Run"
        description="Hide expected output until you run your code"
      >
        <Switch
          checked={practiceMode.revealOutputOnlyAfterRun}
          onCheckedChange={(v) =>
            updateCategory("practiceMode", { revealOutputOnlyAfterRun: v })
          }
        />
      </SettingRow>
    </div>
  );
}

function InterviewModeSection({
  settings,
  toggleInterviewMode,
}: {
  settings: ReturnType<typeof usePlatformSettings>["settings"];
  toggleInterviewMode: () => void;
}) {
  const { interviewMode } = settings;

  return (
    <div className="space-y-4">
      {/* Master Toggle */}
      <div
        className={cn(
          "p-4 rounded-lg border-2 transition-colors",
          interviewMode.enabled
            ? "border-orange-500/50 bg-orange-500/5"
            : "border-border bg-muted/30"
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Timer
                className={cn(
                  "h-5 w-5",
                  interviewMode.enabled
                    ? "text-orange-500"
                    : "text-muted-foreground"
                )}
              />
              <span className="font-semibold">Enable Interview Mode</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Simulate real interview conditions with constraints
            </p>
          </div>
          <Switch
            checked={interviewMode.enabled}
            onCheckedChange={toggleInterviewMode}
          />
        </div>
      </div>

      {/* Interview Mode Features */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">
          When enabled, the following will apply:
        </h4>
        <div className="space-y-2 text-sm">
          {[
            "Hints and solutions are hidden",
            "Minimap is disabled",
            "Font size is locked to 14px",
            "Timer is enabled automatically",
            "Error messages are simplified",
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-muted-foreground">
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  interviewMode.enabled ? "bg-orange-500" : "bg-muted-foreground/50"
                )}
              />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {interviewMode.enabled && (
        <div className="flex items-center gap-2 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
          <span className="text-sm text-orange-700 dark:text-orange-400">
            Interview Mode is active. Good luck!
          </span>
        </div>
      )}
    </div>
  );
}

function ProductivitySection({
  settings,
  updateCategory,
  disabled,
}: {
  settings: ReturnType<typeof usePlatformSettings>["settings"];
  updateCategory: ReturnType<typeof usePlatformSettings>["updateCategory"];
  disabled?: boolean;
}) {
  const { productivity } = settings;

  return (
    <div className="space-y-1">
      <SettingRow
        label="Keyboard Preset"
        description="Choose familiar shortcuts for faster coding"
        disabled={disabled}
      >
        <Select
          value={productivity.keyboardPreset}
          onValueChange={(v: "beginner" | "vscode" | "vim") =>
            updateCategory("productivity", { keyboardPreset: v })
          }
          disabled={disabled}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="vscode">VS Code</SelectItem>
            <SelectItem value="vim">Vim</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Relative Line Numbers"
        description="Shows distance from cursor for Vim-style navigation"
        disabled={disabled}
      >
        <Switch
          checked={productivity.relativeLineNumbers}
          onCheckedChange={(v) =>
            updateCategory("productivity", { relativeLineNumbers: v })
          }
          disabled={disabled}
        />
      </SettingRow>

      <SettingRow
        label="Minimap"
        description="Shows code overview on the right side"
        disabled={disabled}
      >
        <Switch
          checked={productivity.minimap}
          onCheckedChange={(v) =>
            updateCategory("productivity", { minimap: v })
          }
          disabled={disabled}
        />
      </SettingRow>

      <SettingRow
        label="Auto-format on Submit"
        description="Automatically format code before submission"
        disabled={disabled}
      >
        <Switch
          checked={productivity.autoFormatOnSubmit}
          onCheckedChange={(v) =>
            updateCategory("productivity", { autoFormatOnSubmit: v })
          }
          disabled={disabled}
        />
      </SettingRow>
    </div>
  );
}

function AdvancedSection({
  settings,
  updateCategory,
  resetSection,
  resetAll,
}: {
  settings: ReturnType<typeof usePlatformSettings>["settings"];
  updateCategory: ReturnType<typeof usePlatformSettings>["updateCategory"];
  resetSection: (category: keyof typeof settings) => void;
  resetAll: () => void;
}) {
  const { advanced } = settings;
  const [resetSectionDialog, setResetSectionDialog] = useState(false);
  const [resetAllDialog, setResetAllDialog] = useState(false);
  const [sectionToReset, setSectionToReset] = useState<keyof typeof settings | null>(null);

  const handleResetSection = (section: keyof typeof settings) => {
    setSectionToReset(section);
    setResetSectionDialog(true);
  };

  const confirmResetSection = () => {
    if (sectionToReset) {
      resetSection(sectionToReset);
    }
    setResetSectionDialog(false);
    setSectionToReset(null);
  };

  const confirmResetAll = () => {
    resetAll();
    setResetAllDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <SettingRow
          label="Experimental Features"
          description="Try new features before they're fully released"
        >
          <Switch
            checked={advanced.experimentalFeatures}
            onCheckedChange={(v) =>
              updateCategory("advanced", { experimentalFeatures: v })
            }
          />
        </SettingRow>

        <SettingRow
          label="Performance Mode"
          description="Disable visual effects for better performance"
        >
          <Switch
            checked={advanced.performanceMode}
            onCheckedChange={(v) =>
              updateCategory("advanced", { performanceMode: v })
            }
          />
        </SettingRow>
      </div>

      {/* Reset Options */}
      <div className="pt-4 border-t border-border">
        <h4 className="text-sm font-medium mb-3">Reset Options</h4>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, -1).map((cat) => (
              <Button
                key={cat.id}
                variant="outline"
                size="sm"
                onClick={() =>
                  handleResetSection(
                    cat.id === "learning"
                      ? "learningExperience"
                      : cat.id === "editor"
                      ? "codeEditor"
                      : cat.id === "practice"
                      ? "practiceMode"
                      : cat.id === "interview"
                      ? "interviewMode"
                      : "productivity"
                  )
                }
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset {cat.label}
              </Button>
            ))}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setResetAllDialog(true)}
            className="mt-3"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All Settings
          </Button>
        </div>
      </div>

      {/* Reset Section Dialog */}
      <AlertDialog open={resetSectionDialog} onOpenChange={setResetSectionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Section Settings</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore default settings for this section. Your other
              preferences will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetSection}>
              Reset Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset All Dialog */}
      <AlertDialog open={resetAllDialog} onOpenChange={setResetAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Settings</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore all settings to their default values. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResetAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Main Modal Component
// ============================================================================

export function PlatformSettingsModal({
  open,
  onOpenChange,
}: PlatformSettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("learning");
  const {
    settings,
    updateCategory,
    toggleInterviewMode,
    resetSection,
    resetAll,
  } = usePlatformSettings();

  const activeCategoryData = categories.find((c) => c.id === activeCategory);
  const isInterviewMode = settings.interviewMode.enabled;

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const renderContent = () => {
    switch (activeCategory) {
      case "learning":
        return (
          <LearningExperienceSection
            settings={settings}
            updateCategory={updateCategory}
            disabled={isInterviewMode}
          />
        );
      case "editor":
        return (
          <CodeEditorSection
            settings={settings}
            updateCategory={updateCategory}
          />
        );
      case "practice":
        return (
          <PracticeModeSection
            settings={settings}
            updateCategory={updateCategory}
          />
        );
      case "interview":
        return (
          <InterviewModeSection
            settings={settings}
            toggleInterviewMode={toggleInterviewMode}
          />
        );
      case "productivity":
        return (
          <ProductivitySection
            settings={settings}
            updateCategory={updateCategory}
            disabled={isInterviewMode}
          />
        );
      case "advanced":
        return (
          <AdvancedSection
            settings={settings}
            updateCategory={updateCategory}
            resetSection={resetSection}
            resetAll={resetAll}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-sm [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Settings</h2>
            <p className="text-sm text-muted-foreground">
              Customize your UnlockMemory experience
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Interview Mode Banner */}
        {isInterviewMode && (
          <div className="flex items-center gap-2 px-6 py-2 bg-orange-500/10 border-b border-orange-500/30">
            <Timer className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
              Interview Mode is ON — Some settings are locked
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div className="w-56 shrink-0 border-r border-border bg-muted/30 p-3 space-y-1 overflow-y-auto">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Section Header */}
              <div className="mb-6">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  {activeCategoryData && (
                    <activeCategoryData.icon className="h-5 w-5 text-primary" />
                  )}
                  {activeCategoryData?.label}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeCategoryData?.description}
                </p>
              </div>

              {/* Settings Content */}
              {renderContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PlatformSettingsModal;
