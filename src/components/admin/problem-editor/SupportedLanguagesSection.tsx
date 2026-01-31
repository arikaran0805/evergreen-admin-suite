import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

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

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, langId: SupportedLanguage, isDisabled: boolean) => {
    if (isDisabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleLanguage(langId);
    }
  };

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
              // NOTE: Radix Checkbox renders a <button>. Do NOT wrap it in another <button>
              // (invalid nested interactive elements can cause weird click behavior / crashes).
              <div
                key={lang.id}
                role="button"
                tabIndex={isDisabled ? -1 : 0}
                aria-disabled={isDisabled}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left select-none ${
                  isSelected
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted/50 border-input"
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => !isDisabled && toggleLanguage(lang.id)}
                onKeyDown={(e) => handleKeyDown(e, lang.id, isDisabled)}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={isDisabled}
                  className="pointer-events-none"
                />
                <span className="flex items-center gap-2">
                  <span>{lang.icon}</span>
                  <span className="text-sm font-medium">{lang.label}</span>
                </span>
              </div>
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
