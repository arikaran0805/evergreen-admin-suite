import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { COURSE_CHARACTERS, MENTOR_CHARACTER, CourseCharacter, ChatMessage } from "./types";

interface ChatConversationViewProps {
  content: string;
  courseType?: string;
  className?: string;
}

const parseConversation = (content: string): ChatMessage[] => {
  if (!content.trim()) return [];
  
  // Check if content looks like chat format (has "Speaker: message" pattern)
  const chatPattern = /^[^:\n]+:\s*.+$/m;
  if (!chatPattern.test(content)) {
    return [];
  }

  const lines = content.split("\n");
  const messages: ChatMessage[] = [];
  let currentMessage: ChatMessage | null = null;

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      if (currentMessage) {
        messages.push(currentMessage);
      }
      currentMessage = {
        id: Math.random().toString(36).substr(2, 9),
        speaker: match[1].trim(),
        content: match[2].trim(),
      };
    } else if (currentMessage && line.trim()) {
      currentMessage.content += "\n" + line;
    }
  }

  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
};

const ChatConversationView = ({
  content,
  courseType = "python",
  className,
}: ChatConversationViewProps) => {
  const messages = useMemo(() => parseConversation(content), [content]);
  const courseCharacter = COURSE_CHARACTERS[courseType] || COURSE_CHARACTERS.python;

  const getCharacterForSpeaker = (speaker: string): CourseCharacter => {
    if (speaker.toLowerCase() === "karan") {
      return MENTOR_CHARACTER;
    }
    return (
      Object.values(COURSE_CHARACTERS).find(
        (c) => c.name.toLowerCase() === speaker.toLowerCase()
      ) || courseCharacter
    );
  };

  const isMentor = (speaker: string) => speaker.toLowerCase() === "karan";

  // Render code blocks within messages
  const renderContent = (text: string, isMentorBubble: boolean) => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts: { type: string; language?: string; content: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: "code", language: match[1] || "", content: match[2].trim() });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    if (parts.length === 0) {
      parts.push({ type: "text", content: text });
    }

    return parts.map((part, idx) => {
      if (part.type === "code") {
        return (
          <pre
            key={idx}
            className={cn(
              "mt-3 p-4 rounded-xl text-xs font-mono overflow-x-auto",
              "border shadow-inner",
              isMentorBubble
                ? "bg-blue-600/20 border-blue-400/30"
                : "bg-background/80 border-border/50"
            )}
          >
            {part.language && (
              <div className="text-[10px] uppercase tracking-wider opacity-50 mb-2">
                {part.language}
              </div>
            )}
            <code className="leading-relaxed">{part.content}</code>
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

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "chat-conversation-view rounded-2xl overflow-hidden",
        "bg-gradient-to-b from-background via-background to-muted/30",
        "border border-border/50 shadow-xl",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm shadow-lg ring-2 ring-background">
              👨‍💻
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center text-sm shadow-lg ring-2 ring-background">
              {courseCharacter.emoji}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold">
              Karan & {courseCharacter.name}
            </div>
            <div className="text-xs text-muted-foreground">
              Interactive Lesson
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="p-6 space-y-4">
        {messages.map((message, index) => {
          const character = getCharacterForSpeaker(message.speaker);
          const isMentorBubble = isMentor(message.speaker);

          return (
            <div
              key={message.id}
              className={cn(
                "flex items-end gap-2.5 animate-in fade-in-0 slide-in-from-bottom-2",
                isMentorBubble ? "flex-row-reverse" : "flex-row"
              )}
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: "backwards" }}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg",
                  "shadow-lg transition-transform duration-300 hover:scale-110",
                  isMentorBubble
                    ? "bg-gradient-to-br from-blue-400 to-blue-600"
                    : "bg-gradient-to-br from-muted to-muted/80"
                )}
              >
                {character.emoji}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  "relative max-w-[75%] px-5 py-3 rounded-2xl",
                  "shadow-md transition-all duration-200 hover:shadow-lg",
                  isMentorBubble
                    ? "bg-gradient-to-br from-[hsl(210,100%,52%)] to-[hsl(210,100%,45%)] text-white rounded-br-md"
                    : "bg-muted/80 text-foreground rounded-bl-md border border-border/30"
                )}
              >
                {/* Subtle speaker indicator */}
                <div
                  className={cn(
                    "text-[10px] font-semibold mb-1.5 tracking-wide uppercase",
                    isMentorBubble ? "text-blue-100/80" : "text-muted-foreground/70"
                  )}
                >
                  {character.name}
                </div>

                {/* Content */}
                <div className="text-[15px] leading-relaxed">
                  {renderContent(message.content, isMentorBubble)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground">
          💡 Learning through conversation
        </span>
      </div>

      <style>{`
        .chat-conversation-view {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
        }
        
        @keyframes messageAppear {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ChatConversationView;
