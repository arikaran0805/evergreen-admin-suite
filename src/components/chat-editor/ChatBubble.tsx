import { useState, useRef, useEffect } from "react";
import { ChatMessage, CourseCharacter, MENTOR_CHARACTER } from "./types";
import { cn } from "@/lib/utils";
import { GripVertical, icons } from "lucide-react";

// Helper to render icon - handles both emoji and Lucide icon names
const renderCourseIcon = (icon: string | null, size: number = 16) => {
  if (!icon) return "📚";
  
  // Check if it's an emoji (starts with an emoji character)
  const emojiRegex = /^[\p{Emoji}]/u;
  if (emojiRegex.test(icon)) {
    return icon;
  }
  
  // Try to render as Lucide icon
  const LucideIcon = icons[icon as keyof typeof icons];
  if (LucideIcon) {
    return <LucideIcon size={size} />;
  }
  
  return "📚";
};

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

  const handleBlur = () => {
    onEdit(message.id, editContent);
    onEndEdit();
  };

  // Parse content for code blocks
  const renderContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
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

    return parts.map((part, idx) => {
      if (part.type === "code") {
        return (
          <pre
            key={idx}
            className={cn(
              "mt-2 p-3 rounded-lg text-xs font-mono overflow-x-auto",
              isMentor ? "bg-blue-600/30" : "bg-background/50"
            )}
          >
            <code>{part.content}</code>
          </pre>
        );
      }
      return (
        <span key={idx} className="whitespace-pre-wrap">
          {part.content}
        </span>
      );
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
          "relative max-w-[70%] min-w-[60px] px-4 py-2.5 rounded-2xl shadow-sm",
          "transition-all duration-200",
          isMentor
            ? "bg-[hsl(210,100%,52%)] text-white rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md",
          isDragging && "ring-2 ring-primary/50"
        )}
        onDoubleClick={() => onStartEdit(message.id)}
      >
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className={cn(
            "absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 cursor-grab",
            "transition-opacity duration-200",
            isMentor && "-right-6 -left-auto"
          )}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>

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
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cn(
              "w-full min-h-[60px] bg-transparent resize-none outline-none text-sm leading-relaxed",
              isMentor ? "text-white placeholder:text-blue-200" : "text-foreground"
            )}
            placeholder="Type your message..."
          />
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
