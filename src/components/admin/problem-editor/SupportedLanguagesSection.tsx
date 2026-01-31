import type { Dispatch, SetStateAction } from "react";
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
  const toggleLanguage = (langId: SupportedLanguage) => {
    if (disabled) return;

    onChange((prev) => {
      if (prev.includes(langId)) {
        // Don't allow removing if it's the last one
        if (prev.length <= 1) return prev;
        return prev.filter((l) => l !== langId);
      }
      return [...prev, langId];
    });
  };

  const isLastSelected = (langId: SupportedLanguage) => 
    selectedLanguages.length === 1 && selectedLanguages.includes(langId);

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
            const isSelected = selectedLanguages.includes(lang.id);
            const cannotDeselect = isLastSelected(lang.id);
            
            return (
              <button
                type="button"
                key={lang.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  isSelected
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted/50 border-input"
                } ${disabled || cannotDeselect ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => toggleLanguage(lang.id)}
                disabled={disabled || cannotDeselect}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={disabled || cannotDeselect}
                  className="pointer-events-none"
                />
                <span className="flex items-center gap-2">
                  <span>{lang.icon}</span>
                  <span className="text-sm font-medium">{lang.label}</span>
                </span>
              </button>
            );
          })}
        </div>
        {selectedLanguages.length === 0 && (
          <p className="text-xs text-destructive mt-2">
            At least one language must be selected.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
