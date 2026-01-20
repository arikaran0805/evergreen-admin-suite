import { useMemo, useState, useCallback, useRef } from "react";
import { PostAnnotation } from "@/hooks/usePostAnnotations";
import { isChatTranscript, extractChatSegments } from "@/lib/chatContent";
import ChatConversationView from "@/components/chat-editor/ChatConversationView";
import CodeBlock from "@/components/chat-editor/CodeBlock";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";

interface AnnotatedContentProps {
  htmlContent: string;
  courseType?: string;
  codeTheme?: string;
  annotations: PostAnnotation[];
  showAnnotations?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
  onTextSelect?: (selection: {
    start: number;
    end: number;
    text: string;
    type: "paragraph" | "code" | "conversation";
    bubbleIndex?: number;
  }) => void;
  onAnnotationClick?: (annotation: PostAnnotation) => void;
  activeAnnotationId?: string;
}

// Helper to extract code blocks from HTML
const extractCodeBlocks = (html: string): { processedHtml: string; codeBlocks: { code: string; language: string }[] } => {
  const codeBlocks: { code: string; language: string }[] = [];
  const preRegex = /<pre[^>]*class="[^"]*ql-syntax[^"]*"[^>]*>([\s\S]*?)<\/pre>/gi;
  
  let processedHtml = html.replace(preRegex, (match, content) => {
    const decodedContent = content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    
    let language = 'python';
    if (decodedContent.match(/^(function|const|let|var|import|export)\s/m)) {
      language = 'javascript';
    } else if (decodedContent.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)\s/im)) {
      language = 'sql';
    }
    
    codeBlocks.push({ code: decodedContent, language });
    return `<!--CODE_BLOCK_${codeBlocks.length - 1}-->`;
  });
  
  return { processedHtml, codeBlocks };
};

const AnnotatedContent = ({
  htmlContent,
  courseType = "python",
  codeTheme,
  annotations,
  showAnnotations = true,
  isAdmin = false,
  isModerator = false,
  onTextSelect,
  onAnnotationClick,
  activeAnnotationId,
}: AnnotatedContentProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [editedCodes, setEditedCodes] = useState<Record<number, string>>({});

  const isChat = useMemo(() => isChatTranscript(htmlContent), [htmlContent]);
  const { processedHtml, codeBlocks } = useMemo(() => extractCodeBlocks(htmlContent), [htmlContent]);

  // Get annotations for specific content type
  const getAnnotationsForType = useCallback((type: "paragraph" | "code" | "conversation", index?: number) => {
    return annotations.filter(a => {
      if (type === "conversation" && a.bubble_index !== null) {
        return index !== undefined && a.bubble_index === index;
      }
      if (a.bubble_index !== null) return false;
      return a.editor_type === (type === "code" ? "rich-text" : type);
    });
  }, [annotations]);

  // Handle text selection for creating annotations
  const handleTextSelection = useCallback((type: "paragraph" | "code" | "conversation", bubbleIndex?: number) => {
    if (!onTextSelect) return;
    if (!isAdmin && !isModerator) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    const range = selection.getRangeAt(0);
    
    onTextSelect({
      start: range.startOffset,
      end: range.endOffset,
      text,
      type,
      bubbleIndex,
    });
  }, [onTextSelect, isAdmin, isModerator]);

  const handleCodeEdit = (index: number, newCode: string) => {
    setEditedCodes(prev => ({ ...prev, [index]: newCode }));
  };

  // Render annotation indicator
  const AnnotationIndicator = ({ annotation, onClick }: { annotation: PostAnnotation; onClick?: () => void }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs transition-all",
        annotation.status === "open" 
          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50"
          : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/50",
        activeAnnotationId === annotation.id && "ring-2 ring-primary"
      )}
    >
      <MessageSquare className="h-3 w-3" />
      {annotation.replies?.length ? annotation.replies.length : ""}
    </button>
  );

  // Render highlighted text with annotation (XSS-safe)
  const renderHighlightedText = (text: string, contentAnnotations: PostAnnotation[]) => {
    if (!showAnnotations || contentAnnotations.length === 0) {
      return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />;
    }

    // Group annotations by their position
    const openAnnotations = contentAnnotations.filter(a => a.status === "open");
    const resolvedAnnotations = contentAnnotations.filter(a => a.status !== "open");

    return (
      <span className="relative">
        <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
        {openAnnotations.length > 0 && (
          <span className="absolute -top-1 -right-1">
            <Badge 
              variant="destructive" 
              className="h-4 min-w-4 p-0 flex items-center justify-center text-[10px] cursor-pointer hover:scale-110 transition-transform"
              onClick={() => onAnnotationClick?.(openAnnotations[0])}
            >
              {openAnnotations.length}
            </Badge>
          </span>
        )}
      </span>
    );
  };

  // Render chat content with annotations
  if (isChat) {
    const chatBubbles = extractChatSegments(htmlContent, { allowSingle: true });
    
    return (
      <div className="my-6 space-y-4">
        {chatBubbles.map((bubble, index) => {
          const bubbleAnnotations = annotations.filter(a => a.bubble_index === index);
          const hasOpenAnnotations = bubbleAnnotations.some(a => a.status === "open");
          
          return (
            <div
              key={index}
              className={cn(
                "relative group",
                showAnnotations && hasOpenAnnotations && "ring-2 ring-amber-400 dark:ring-amber-600 rounded-xl"
              )}
              onMouseUp={() => handleTextSelection("conversation", index)}
            >
              {/* Annotation indicators */}
              {showAnnotations && bubbleAnnotations.length > 0 && (
                <div className="absolute -top-2 right-2 z-10 flex gap-1">
                  {bubbleAnnotations.map(a => (
                    <AnnotationIndicator 
                      key={a.id} 
                      annotation={a}
                      onClick={() => onAnnotationClick?.(a)} 
                    />
                  ))}
                </div>
              )}
              
              <ChatBubbleWrapper
                bubble={bubble}
                courseType={courseType}
                codeTheme={codeTheme}
                canAnnotate={isAdmin || isModerator}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Render regular content with annotations
  if (codeBlocks.length === 0) {
    const contentAnnotations = annotations.filter(a => a.bubble_index === null);
    
    return (
      <div
        ref={contentRef}
        className="prose prose-lg max-w-none relative"
        onMouseUp={() => handleTextSelection("paragraph")}
      >
        {showAnnotations && contentAnnotations.length > 0 && (
          <div className="absolute -top-2 right-0 flex gap-1 z-10">
            {contentAnnotations.slice(0, 3).map(a => (
              <AnnotationIndicator 
                key={a.id} 
                annotation={a}
                onClick={() => onAnnotationClick?.(a)} 
              />
            ))}
            {contentAnnotations.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{contentAnnotations.length - 3}
              </Badge>
            )}
          </div>
        )}
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>
    );
  }

  // Split HTML by code block placeholders and render with annotations
  const parts = processedHtml.split(/<!--CODE_BLOCK_(\d+)-->/);

  return (
    <div className="prose prose-lg max-w-none">
      {parts.map((part, idx) => {
        if (idx % 2 === 0) {
          // HTML content
          const partAnnotations = annotations.filter(a => 
            a.bubble_index === null && a.editor_type !== "code"
          );
          
          return part ? (
            <div
              key={idx}
              className="relative"
              onMouseUp={() => handleTextSelection("paragraph")}
            >
              {showAnnotations && partAnnotations.length > 0 && idx === 0 && (
                <div className="absolute -top-2 right-0 flex gap-1 z-10">
                  {partAnnotations.slice(0, 2).map(a => (
                    <AnnotationIndicator 
                      key={a.id} 
                      annotation={a}
                      onClick={() => onAnnotationClick?.(a)} 
                    />
                  ))}
                </div>
              )}
              <div dangerouslySetInnerHTML={{ __html: part }} />
            </div>
          ) : null;
        } else {
          // Code block
          const codeBlockIndex = parseInt(part, 10);
          const block = codeBlocks[codeBlockIndex];
          if (!block) return null;

          return (
            <div 
              key={idx} 
              className="my-4 not-prose relative"
              onMouseUp={() => handleTextSelection("code")}
            >
              <CodeBlock
                code={editedCodes[codeBlockIndex] ?? block.code}
                language={block.language}
                editable={true}
                overrideTheme={codeTheme || "clean"}
                onEdit={(newCode) => handleCodeEdit(codeBlockIndex, newCode)}
                showToolbarAlways
              />
            </div>
          );
        }
      })}
    </div>
  );
};

// Wrapper for chat bubble to maintain styling
interface ChatBubbleWrapperProps {
  bubble: { speaker: string; content: string };
  courseType: string;
  codeTheme?: string;
  canAnnotate: boolean;
}

const ChatBubbleWrapper = ({ bubble, courseType, codeTheme, canAnnotate }: ChatBubbleWrapperProps) => {
  const isMentor = bubble.speaker?.toLowerCase() === "karan";
  
  return (
    <div className={cn(
      "flex items-end gap-2.5",
      isMentor ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md",
        isMentor
          ? "bg-gradient-to-br from-blue-400 to-blue-600"
          : "bg-gradient-to-br from-muted to-muted/80"
      )}>
        {isMentor ? "👨‍💻" : "🤖"}
      </div>

      {/* Bubble */}
      <div className={cn(
        "relative max-w-[85%] px-4 py-3 rounded-2xl shadow-sm",
        isMentor
          ? "bg-gradient-to-br from-[hsl(210,100%,52%)] to-[hsl(210,100%,45%)] text-white rounded-br-md"
          : "bg-muted/80 text-foreground rounded-bl-md border border-border/30"
      )}>
        {/* Speaker */}
        <div className={cn(
          "text-[10px] font-semibold mb-1 tracking-wide uppercase",
          isMentor ? "text-blue-100/80" : "text-primary"
        )}>
          {bubble.speaker || "Assistant"}
        </div>

        {/* Content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {bubble.content}
        </div>
      </div>
    </div>
  );
};

export default AnnotatedContent;