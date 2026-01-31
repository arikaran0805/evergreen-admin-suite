import { useState, type Dispatch, type KeyboardEvent, type SetStateAction } from "react";
import { X, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SUGGESTED_TAGS = [
  "Python",
  "SQL",
  "Java",
  "Java Script",
  "R",
  "Pandas",
  "Lumpy",
];

interface ProblemTagsSectionProps {
  tags: string[];
  onChange: Dispatch<SetStateAction<string[]>>;
  disabled?: boolean;
}

export function ProblemTagsSection({
  tags,
  onChange,
  disabled = false,
}: ProblemTagsSectionProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (tag: string) => {
    const normalizedTag = tag.trim();
    if (!normalizedTag) return;

    onChange((prev) => (prev.includes(normalizedTag) ? prev : [...prev, normalizedTag]));
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onChange((prev) => prev.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Enter") {
      e.preventDefault();
      addTag(inputValue);
    }

    // Convenience: backspace on empty input removes last tag
    if (e.key === "Backspace" && inputValue.trim() === "") {
      if (tags.length > 0) {
        e.preventDefault();
        onChange((prev) => prev.slice(0, -1));
      }
    }
  };

  const suggestionsToShow = SUGGESTED_TAGS.filter(
    (tag) => !tags.includes(tag)
  ).slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Problem Tags</CardTitle>
        <p className="text-sm text-muted-foreground">
          Used for filtering and recommendations.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Tags */}
        <div className="flex flex-wrap gap-2 min-h-[36px]">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="pl-3 pr-1 py-1.5 text-sm flex items-center gap-1"
            >
              {tag}
              <button
                type="button"
                className="h-5 w-5 ml-1 rounded-full hover:bg-destructive/20 flex items-center justify-center disabled:opacity-50"
                onClick={() => removeTag(tag)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {tags.length === 0 && (
            <span className="text-sm text-muted-foreground">No tags added</span>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a tag and press Enter..."
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addTag(inputValue)}
            disabled={disabled || !inputValue.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggestions */}
        {suggestionsToShow.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-1">
              {suggestionsToShow.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => !disabled && addTag(tag)}
                >
                  + {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
