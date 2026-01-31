import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
  onChange: (languages: SupportedLanguage[]) => void;
  disabled?: boolean;
}

export function SupportedLanguagesSection({
  selectedLanguages,
  onChange,
  disabled = false,
}: SupportedLanguagesSectionProps) {
  const toggleLanguage = (langId: SupportedLanguage) => {
    if (selectedLanguages.includes(langId)) {
      // Don't allow removing if it's the last one
      if (selectedLanguages.length > 1) {
        onChange(selectedLanguages.filter((l) => l !== langId));
      }
    } else {
      onChange([...selectedLanguages, langId]);
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
          {AVAILABLE_LANGUAGES.map((lang) => (
            <div
              key={lang.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedLanguages.includes(lang.id)
                  ? "bg-primary/10 border-primary"
                  : "hover:bg-muted/50"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => !disabled && toggleLanguage(lang.id)}
            >
              <Checkbox
                id={`lang-${lang.id}`}
                checked={selectedLanguages.includes(lang.id)}
                disabled={disabled || (selectedLanguages.length === 1 && selectedLanguages.includes(lang.id))}
                onCheckedChange={() => toggleLanguage(lang.id)}
              />
              <Label
                htmlFor={`lang-${lang.id}`}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span>{lang.icon}</span>
                <span className="text-sm">{lang.label}</span>
              </Label>
            </div>
          ))}
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
