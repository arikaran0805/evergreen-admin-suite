import type { Dispatch, SetStateAction } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";

export const AVAILABLE_LANGUAGES = [
  { id: "python", label: "Python", icon: "🐍" },
  { id: "javascript", label: "JavaScript", icon: "📜" },
  { id: "java", label: "Java", icon: "☕" },
  { id: "cpp", label: "C++", icon: "⚡" },
  { id: "sql", label: "SQL", icon: "🗃️" },
] as const;

export type SupportedLanguage = typeof AVAILABLE_LANGUAGES[number]["id"];

interface SupportedLanguagesSectionProps {
  selectedLanguages: SupportedLanguage[];
  onChange: Dispatch<SetStateAction<SupportedLanguage[]>>;
  disabled?: boolean;
}

export function SupportedLanguagesSection({
  selectedLanguages,
  onChange,
  disabled = false,
}: SupportedLanguagesSectionProps) {
  // Defensive: if a malformed value ever gets into state (e.g. from persistence),
  // avoid crashing the whole page on `.includes`/`.length`.
  const selectedLanguagesSafe: SupportedLanguage[] = Array.isArray(selectedLanguages)
    ? selectedLanguages
    : [];

  const toggleLanguage = (langId: SupportedLanguage) => {
    if (disabled) return;

    // NOTE: React state updaters run asynchronously; errors thrown inside them
    // won't be caught by try/catch here. So we must make the updater itself
    // throw-proof.
    onChange((prev) => {
      const prevSafe: SupportedLanguage[] = Array.isArray(prev) ? prev : [];

      if (prevSafe.includes(langId)) {
        // Don't allow removing if it's the last one
        if (prevSafe.length <= 1) return prevSafe;
        return prevSafe.filter((l) => l !== langId);
      }

      return [...prevSafe, langId];
    });
  };

  const isLastSelected = (langId: SupportedLanguage) =>
    selectedLanguagesSafe.length === 1 && selectedLanguagesSafe.includes(langId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supported Languages</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select which languages are available for this problem. At least one required.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {AVAILABLE_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguagesSafe.includes(lang.id);
            const cannotDeselect = isLastSelected(lang.id);
            const isDisabled = disabled || cannotDeselect;
            
            return (
              <button
                key={lang.id}
                type="button"
                aria-pressed={isSelected}
                disabled={isDisabled}
                onClick={(e) => {
                  // Defensive: ensure we never accidentally submit the parent form
                  e.preventDefault();
                  if (!isDisabled) toggleLanguage(lang.id);
                }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left select-none ${
                  isSelected
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted/50 border-input"
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {isSelected ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">{lang.icon}</span>
                  <span className="text-sm font-medium">{lang.label}</span>
                </span>
              </button>
            );
          })}
        </div>
        {selectedLanguagesSafe.length === 0 && (
          <p className="text-xs text-destructive mt-2">
            At least one language must be selected.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
