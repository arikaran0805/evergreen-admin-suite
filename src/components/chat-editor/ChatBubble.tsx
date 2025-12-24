import { useState, useRef, useEffect } from "react";
import { ChatMessage, CourseCharacter, MENTOR_CHARACTER } from "./types";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { renderCourseIcon } from "./utils";
import CodeBlock from "./CodeBlock";
import { Button } from "@/components/ui/button";

interface ChatBubbleProps {
  message: ChatMessage;
  character: CourseCharacter;
  isMentor: boolean;
  isEditing: boolean;
  onEdit: (id: string, content: string) => void;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  codeTheme?: string;
}

const ChatBubble = ({
  message,
  character,
  isMentor,
  isEditing,
  onEdit,
  onStartEdit,
  onEndEdit,
  isDragging,
  dragHandleProps,
  codeTheme,
}: ChatBubbleProps) => {
  const [editContent, setEditContent] = useState(message.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEdit(message.id, editContent);
      onEndEdit();
    }
    if (e.key === "Escape") {
      setEditContent(message.content);
      onEndEdit();
    }
  };

  const handleSave = () => {
    onEdit(message.id, editContent);
    onEndEdit();
  };

  const handleCancel = () => {
    setEditContent(message.content);
    onEndEdit();
  };

  // Parse content for code blocks and inline code
  const renderContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts: { type: string; language?: string; content: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: "code", language: match[1] || "", content: match[2].trim() });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: "text", content: content.slice(lastIndex) });
    }

    if (parts.length === 0) {
      parts.push({ type: "text", content });
    }

    // Render inline code within text parts
    const renderTextWithInlineCode = (text: string, key: number) => {
      const inlineCodeRegex = /`([^`]+)`/g;
      const segments: React.ReactNode[] = [];
      let lastIdx = 0;
      let inlineMatch;

      while ((inlineMatch = inlineCodeRegex.exec(text)) !== null) {
        if (inlineMatch.index > lastIdx) {
          segments.push(
            <span key={`${key}-text-${lastIdx}`} className="whitespace-pre-wrap">
              {text.slice(lastIdx, inlineMatch.index)}
            </span>
          );
        }
        segments.push(
          <code
            key={`${key}-code-${inlineMatch.index}`}
            className={cn(
              "px-1.5 py-0.5 rounded text-xs font-mono",
              isMentor
                ? "bg-blue-500/30 text-blue-100"
                : "bg-muted-foreground/20 text-foreground"
            )}
          >
            {inlineMatch[1]}
          </code>
        );
        lastIdx = inlineMatch.index + inlineMatch[0].length;
      }

      if (lastIdx < text.length) {
        segments.push(
          <span key={`${key}-text-end`} className="whitespace-pre-wrap">
            {text.slice(lastIdx)}
          </span>
        );
      }

      return segments.length > 0 ? segments : <span className="whitespace-pre-wrap">{text}</span>;
    };

    return parts.map((part, idx) => {
      if (part.type === "code") {
        return (
          <CodeBlock
            key={idx}
            code={part.content}
            language={part.language}
            isMentorBubble={isMentor}
            overrideTheme={codeTheme}
            editable
          />
        );
      }
      return <span key={idx}>{renderTextWithInlineCode(part.content, idx)}</span>;
    });
  };

  return (
    <div
      className={cn(
        "group flex items-end gap-2 mb-3 transition-all duration-200",
        isMentor ? "flex-row-reverse" : "flex-row",
        isDragging && "opacity-50 scale-105"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg",
          "shadow-sm transition-transform duration-200 group-hover:scale-110",
          isMentor ? "bg-gradient-to-br from-blue-400 to-blue-600" : "bg-gradient-to-br from-muted to-muted/80"
        )}
      >
        {renderCourseIcon(character.emoji, 18)}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "relative max-w-[85%] min-w-[60px] px-4 py-2.5 rounded-2xl shadow-sm",
          "transition-all duration-200",
          isMentor
            ? "bg-[hsl(210,100%,52%)] text-white rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md",
          isDragging && "ring-2 ring-primary/50"
        )}
      >

        {/* Speaker name (subtle) */}
        <div
          className={cn(
            "text-[10px] font-medium mb-1 opacity-70 flex items-center gap-1",
            isMentor ? "text-blue-100" : "text-muted-foreground"
          )}
        >
          {character.name} {renderCourseIcon(character.emoji, 12)}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full min-h-[80px] bg-transparent resize-y outline-none text-sm leading-relaxed border rounded-lg p-2",
                isMentor ? "text-white placeholder:text-blue-200 border-blue-300/30" : "text-foreground border-border"
              )}
              placeholder="Type your message..."
            />
            <div className="flex items-center gap-1 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className={cn(
                  "h-7 px-2 text-xs",
                  isMentor ? "text-blue-100 hover:bg-blue-500/30" : ""
                )}
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                className={cn(
                  "h-7 px-2 text-xs",
                  isMentor ? "text-blue-100 hover:bg-blue-500/30 bg-blue-500/20" : "bg-primary/10"
                )}
              >
                <Check className="w-3 h-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed">{renderContent(message.content)}</div>
        )}

        {/* Timestamp (optional) */}
        {message.timestamp && (
          <div
            className={cn(
              "text-[9px] mt-1 opacity-50",
              isMentor ? "text-blue-100 text-right" : "text-muted-foreground"
            )}
          >
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
