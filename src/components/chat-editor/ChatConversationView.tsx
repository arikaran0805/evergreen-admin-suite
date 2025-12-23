import { useMemo, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MENTOR_CHARACTER, CourseCharacter, ChatMessage } from "./types";
import { extractChatSegments, extractExplanation } from "@/lib/chatContent";
import { supabase } from "@/integrations/supabase/client";
import { icons } from "lucide-react";

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

interface ChatConversationViewProps {
  content: string;
  courseType?: string;
  className?: string;
}

interface Course {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

const parseConversation = (content: string): ChatMessage[] => {
  const segments = extractChatSegments(content);
  if (segments.length === 0) return [];

  return segments.map((s) => ({
    id: Math.random().toString(36).substr(2, 9),
    speaker: s.speaker,
    content: s.content,
  }));
};

const ChatConversationView = ({
  content,
  courseType = "python",
  className,
}: ChatConversationViewProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const messages = useMemo(() => parseConversation(content), [content]);
  const explanation = useMemo(() => extractExplanation(content), [content]);

  // Fetch courses from database
  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, slug, icon")
        .order("name");
      
      if (!error && data) {
        setCourses(data);
      }
    };
    fetchCourses();
  }, []);

  // Get course character from fetched courses
  const getCourseCharacter = useCallback((courseSlug: string): CourseCharacter => {
    const course = courses.find(c => c.slug === courseSlug);
    if (course) {
      return {
        name: course.name,
        emoji: course.icon || "📚",
        color: "hsl(var(--foreground))",
        bgColor: "hsl(var(--muted))",
      };
    }
    return {
      name: "Course",
      emoji: "📚",
      color: "hsl(var(--foreground))",
      bgColor: "hsl(var(--muted))",
    };
  }, [courses]);

  const courseCharacter = getCourseCharacter(courseType);

  const getCharacterForSpeaker = useCallback((speaker: string): CourseCharacter => {
    if (speaker.toLowerCase() === "karan") {
      return MENTOR_CHARACTER;
    }
    // Find matching course by name
    const matchingCourse = courses.find(
      (c) => c.name.toLowerCase() === speaker.toLowerCase()
    );
    if (matchingCourse) {
      return {
        name: matchingCourse.name,
        emoji: matchingCourse.icon || "📚",
        color: "hsl(var(--foreground))",
        bgColor: "hsl(var(--muted))",
      };
    }
    return courseCharacter;
  }, [courses, courseCharacter]);

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
    <div className={cn("space-y-6", className)}>
      {/* Chat conversation */}
      <div
        className={cn(
          "chat-conversation-view rounded-2xl overflow-hidden",
          "bg-gradient-to-b from-background via-background to-muted/30",
          "border border-border/50 shadow-xl"
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
                {renderCourseIcon(courseCharacter.emoji, 16)}
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
                  {renderCourseIcon(character.emoji, 18)}
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

      {/* Explanation section (if present) */}
      {explanation && (
        <div className="prose prose-sm dark:prose-invert max-w-none p-6 rounded-xl bg-muted/30 border border-border/50">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="text-xl">📝</span> Explanation
          </h3>
          <div 
            className="leading-relaxed text-foreground/90"
            dangerouslySetInnerHTML={{ __html: explanation }}
          />
        </div>
      )}
    </div>
  );
};

export default ChatConversationView;
