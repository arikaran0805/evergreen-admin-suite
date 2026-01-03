import { useMemo, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MENTOR_CHARACTER, CourseCharacter, ChatMessage } from "./types";
import { extractChatSegments, extractExplanation } from "@/lib/chatContent";
import { supabase } from "@/integrations/supabase/client";
import { renderCourseIcon } from "./utils";
import CodeBlock from "./CodeBlock";
import { CHAT_COLORS, getChatColors } from "./chatColors";

interface ChatConversationViewProps {
  content: string;
  courseType?: string;
  className?: string;
  codeTheme?: string;
}

interface Course {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

// Takeaway format: [TAKEAWAY:icon:title]: content
const TAKEAWAY_REGEX = /^\[TAKEAWAY(?::([^:]*?))?(?::([^\]]*?))?\]:\s*/;

const parseConversation = (content: string): ChatMessage[] => {
  const segments = extractChatSegments(content);
  if (segments.length === 0) return [];

  return segments.map((s, index) => {
    const takeawayMatch = s.content.match(TAKEAWAY_REGEX);
    if (s.speaker === "TAKEAWAY" || takeawayMatch) {
      const icon = takeawayMatch?.[1] || "🧠";
      const title = takeawayMatch?.[2] || "One-Line Takeaway for Learners";
      const actualContent = takeawayMatch 
        ? s.content.replace(TAKEAWAY_REGEX, "").trim()
        : s.content;
      return {
        id: `takeaway-${index}`,
        speaker: "TAKEAWAY",
        content: actualContent,
        type: "takeaway" as const,
        takeawayIcon: icon,
        takeawayTitle: title,
      };
    }
    return {
      id: `msg-${index}-${s.speaker}`,
      speaker: s.speaker,
      content: s.content,
      type: "message" as const,
    };
  });
};

// Helper to extract code blocks from HTML and replace with placeholders
const extractCodeBlocksFromHtml = (html: string): {
  processedHtml: string;
  codeBlocks: { code: string; language: string }[];
} => {
  const codeBlocks: { code: string; language: string }[] = [];

  // Match <pre class="ql-syntax"...>...</pre> from Quill editor
  const preRegex = /<pre[^>]*class="[^"]*ql-syntax[^"]*"[^>]*>([\s\S]*?)<\/pre>/gi;

  const processedHtml = html.replace(preRegex, (_match, content) => {
    const decodedContent = String(content)
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<br\s*\/?>(\r?\n)?/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();

    let language = "python";
    if (decodedContent.match(/^(function|const|let|var|import|export)\s/m)) {
      language = "javascript";
    } else if (decodedContent.match(/^(def|class|import|from|print)\s/m)) {
      language = "python";
    } else if (decodedContent.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)\s/im)) {
      language = "sql";
    }

    codeBlocks.push({ code: decodedContent, language });
    return `<!--CODE_BLOCK_${codeBlocks.length - 1}-->`;
  });

  return { processedHtml, codeBlocks };
};

const ChatConversationView = ({
  content,
  courseType = "python",
  className,
  codeTheme,
}: ChatConversationViewProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const messages = useMemo(() => parseConversation(content), [content]);
  const explanation = useMemo(() => extractExplanation(content), [content]);

  const { processedHtml: explanationHtml, codeBlocks: explanationCodeBlocks } = useMemo(() => {
    if (!explanation) return { processedHtml: "", codeBlocks: [] as { code: string; language: string }[] };
    return extractCodeBlocksFromHtml(explanation);
  }, [explanation]);

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

  // Parse inline markdown formatting (bold, italic, inline code)
  const parseInlineMarkdown = (text: string, baseKey: string, isMentorBubble: boolean): React.ReactNode[] => {
    const segments: React.ReactNode[] = [];
    
    // Combined regex for all inline formatting
    // Order matters: bold first, then italic
    const markdownRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+)`)/g;
    
    let lastIdx = 0;
    let match;
    
    while ((match = markdownRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIdx) {
        segments.push(
          <span key={`${baseKey}-text-${lastIdx}`} className="whitespace-pre-wrap">
            {text.slice(lastIdx, match.index)}
          </span>
        );
      }
      
      if (match[1]) {
        // Bold: **text**
        segments.push(
          <strong key={`${baseKey}-bold-${match.index}`} className="font-bold">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // Italic: *text*
        segments.push(
          <em key={`${baseKey}-italic-${match.index}`} className="italic">
            {match[4]}
          </em>
        );
      } else if (match[5]) {
        // Inline code: `code`
        const colors = getChatColors(isMentorBubble);
        segments.push(
          <code
            key={`${baseKey}-code-${match.index}`}
            className={cn(
              "px-1.5 py-0.5 rounded text-xs font-mono",
              colors.inlineCode
            )}
          >
            {match[6]}
          </code>
        );
      }
      
      lastIdx = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIdx < text.length) {
      segments.push(
        <span key={`${baseKey}-text-end`} className="whitespace-pre-wrap">
          {text.slice(lastIdx)}
        </span>
      );
    }
    
    return segments.length > 0 ? segments : [<span key={baseKey} className="whitespace-pre-wrap">{text}</span>];
  };

  // Parse line-level markdown (headings, lists, blockquotes)
  const parseLineMarkdown = (text: string, baseKey: string, isMentorBubble: boolean): React.ReactNode[] => {
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    
    lines.forEach((line, lineIdx) => {
      const lineKey = `${baseKey}-line-${lineIdx}`;
      
      // Heading: ## text
      if (line.match(/^##\s+(.+)$/)) {
        const headingContent = line.replace(/^##\s+/, '');
        result.push(
          <h2 key={lineKey} className="text-base font-bold mt-2 mb-1">
            {parseInlineMarkdown(headingContent, lineKey, isMentorBubble)}
          </h2>
        );
      }
      // Blockquote: > text
      else if (line.match(/^>\s+(.+)$/)) {
        const quoteContent = line.replace(/^>\s+/, '');
        const colors = getChatColors(isMentorBubble);
        result.push(
          <blockquote key={lineKey} className={cn(
            "border-l-2 pl-3 my-1 italic",
            colors.blockquoteBorder
          )}>
            {parseInlineMarkdown(quoteContent, lineKey, isMentorBubble)}
          </blockquote>
        );
      }
      // Bullet list: • text or - text
      else if (line.match(/^[•\-]\s+(.+)$/)) {
        const listContent = line.replace(/^[•\-]\s+/, '');
        result.push(
          <div key={lineKey} className="flex items-start gap-2 ml-1">
            <span className="text-sm">•</span>
            <span>{parseInlineMarkdown(listContent, lineKey, isMentorBubble)}</span>
          </div>
        );
      }
      // Numbered list: 1. text
      else if (line.match(/^(\d+)\.\s+(.+)$/)) {
        const match = line.match(/^(\d+)\.\s+(.+)$/);
        if (match) {
          result.push(
            <div key={lineKey} className="flex items-start gap-2 ml-1">
              <span className="text-sm min-w-[1rem]">{match[1]}.</span>
              <span>{parseInlineMarkdown(match[2], lineKey, isMentorBubble)}</span>
            </div>
          );
        }
      }
      // Regular text with inline formatting
      else if (line.trim()) {
        result.push(
          <span key={lineKey}>
            {parseInlineMarkdown(line, lineKey, isMentorBubble)}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        );
      }
      // Empty line
      else if (lineIdx < lines.length - 1) {
        result.push(<br key={lineKey} />);
      }
    });
    
    return result;
  };

  // Render code blocks and inline code within messages
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
          <CodeBlock
            key={idx}
            code={part.content}
            language={part.language}
            isMentorBubble={isMentorBubble}
            overrideTheme={codeTheme}
            editable
          />
        );
      }
      return <span key={idx}>{parseLineMarkdown(part.content, `part-${idx}`, isMentorBubble)}</span>;
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm shadow-lg ring-2 ring-background">
                👨‍🎓
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
            // Render takeaway blocks
            if (message.type === "takeaway") {
              const icon = message.takeawayIcon || "🧠";
              const title = message.takeawayTitle || "One-Line Takeaway for Learners";
              return (
                <div
                  key={message.id}
                  className={cn(
                    "my-4 rounded-xl overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2",
                    "border-t border-b border-border/50",
                    "bg-gradient-to-r from-muted/20 to-muted/10"
                  )}
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: "backwards" }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
                    <span className="text-xl">{icon}</span>
                    <span className="font-semibold text-sm text-foreground">{title}</span>
                  </div>

                  {/* Content */}
                  <div className="px-4 py-3 pl-6 relative">
                    <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-primary/40 rounded-full" />
                    <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            }

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
                    getChatColors(isMentorBubble).avatar
                  )}
                >
                  {isMentorBubble ? (
                    <span className="text-sm">👨‍🎓</span>
                  ) : (
                    renderCourseIcon(character.emoji, 18)
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "relative max-w-[75%] px-5 py-3 rounded-2xl",
                    "shadow-md transition-all duration-200 hover:shadow-lg",
                    getChatColors(isMentorBubble).bubble,
                    getChatColors(isMentorBubble).text,
                    isMentorBubble
                      ? "rounded-br-md"
                      : "rounded-bl-md border border-border/30"
                  )}
                >
                  {/* Subtle speaker indicator */}
                  <div
                    className={cn(
                      "text-[10px] font-semibold mb-1.5 tracking-wide uppercase",
                      getChatColors(isMentorBubble).speaker
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

          {explanationCodeBlocks.length === 0 ? (
            <div
              className="leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{ __html: explanation }}
            />
          ) : (
            <div className="leading-relaxed text-foreground/90">
              {explanationHtml.split(/<!--CODE_BLOCK_(\d+)-->/).map((part, idx) => {
                if (idx % 2 === 0) {
                  return part ? (
                    <div key={idx} dangerouslySetInnerHTML={{ __html: part }} />
                  ) : null;
                }

                const codeBlockIndex = parseInt(part, 10);
                const block = explanationCodeBlocks[codeBlockIndex];
                if (!block) return null;

                return (
                  <div key={idx} className="my-4 not-prose">
                    <CodeBlock
                      code={block.code}
                      language={block.language}
                      overrideTheme={codeTheme}
                      editable
                      showToolbarAlways
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatConversationView;
