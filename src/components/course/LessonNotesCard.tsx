import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { StickyNote, Loader2, Check } from "lucide-react";

interface LessonNotesCardProps {
  content: string;
  updateContent: (content: string) => void;
  isSaving: boolean;
  lastSavedText: string | null;
  isLoading: boolean;
}

export function LessonNotesCard({
  content,
  updateContent,
  isSaving,
  lastSavedText,
  isLoading,
}: LessonNotesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Focus textarea when expanded
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  const handleExpand = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if focus is moving to another element within the card
    if (cardRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsExpanded(false);
  };

  // Preview text: first 2 lines, clamped
  const hasContent = content.trim().length > 0;

  return (
    <Card
      ref={cardRef}
      className={cn(
        "border-border/50 bg-card/50 backdrop-blur-sm shadow-sm transition-all duration-200 ease-out overflow-hidden",
        !isExpanded && "cursor-pointer hover:bg-card/70"
      )}
      onClick={handleExpand}
      onBlur={handleBlur}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            Your Notes
          </CardTitle>
          {isSaving ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          ) : lastSavedText ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3" />
              {lastSavedText}
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0">
        {isLoading ? (
          <div className="h-6 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : isExpanded ? (
          // Expanded: comfortable textarea
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => updateContent(e.target.value)}
            placeholder="Write your thoughts, shortcuts, or reminders…"
            className="resize-none border-border/50 bg-background/50 text-sm min-h-[100px] transition-all duration-200"
          />
        ) : hasContent ? (
          // Collapsed with content: preview
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {content}
          </p>
        ) : (
          // Collapsed empty: placeholder
          <p className="text-sm text-muted-foreground/70 italic">
            Write your thoughts, shortcuts, or reminders…
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default LessonNotesCard;
