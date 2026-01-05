import { useMemo, useState, useCallback, useRef } from "react";
import { PostAnnotation } from "@/hooks/usePostAnnotations";
import { isChatTranscript, extractChatSegments } from "@/lib/chatContent";
import CodeBlock from "@/components/chat-editor/CodeBlock";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lightbulb, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // Handle text selection for creating annotations
  const handleTextSelection = useCallback((type: "paragraph" | "code" | "conversation", bubbleIndex?: number) => {
    if (!onTextSelect) return;
    if (!isAdmin && !isModerator) return;
    if (isModerator && !isAdmin && type === "conversation") return;

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

  // Annotation indicator with gentle styling
  const AnnotationIndicator = ({ 
    annotation, 
    onClick,
    count = 1 
  }: { 
    annotation: PostAnnotation; 
    onClick?: () => void;
    count?: number;
  }) => {
    const isOpen = annotation.status === "open";
    const replyCount = annotation.replies?.length || 0;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all",
                "hover:scale-105 active:scale-95",
                isOpen 
                  ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-sm shadow-amber-200/50 dark:shadow-amber-900/30"
                  : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
                activeAnnotationId === annotation.id && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <Lightbulb className="h-3 w-3" />
              {count > 1 && <span>{count}</span>}
              {replyCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] opacity-70">
                  <MessageCircle className="h-2.5 w-2.5" />
                  {replyCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className={cn(
              "max-w-[250px] p-3",
              isOpen ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" : ""
            )}
          >
            <p className="text-xs font-medium mb-1 text-muted-foreground">
              {isOpen ? "Teaching note" : "Addressed"}
            </p>
            <p className="text-sm line-clamp-3">{annotation.comment}</p>
            <p className="text-[10px] text-muted-foreground mt-2">
              Click to view details
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
                showAnnotations && hasOpenAnnotations && "ring-2 ring-amber-300 dark:ring-amber-700 ring-offset-2 rounded-2xl"
              )}
              onMouseUp={() => handleTextSelection("conversation", index)}
            >
              {/* Annotation indicators */}
              {showAnnotations && bubbleAnnotations.length > 0 && (
                <div className="absolute -top-3 right-3 z-10 flex gap-1">
                  {bubbleAnnotations.length === 1 ? (
                    <AnnotationIndicator 
                      annotation={bubbleAnnotations[0]}
                      onClick={() => onAnnotationClick?.(bubbleAnnotations[0])} 
                    />
                  ) : (
                    <AnnotationIndicator 
                      annotation={bubbleAnnotations[0]}
                      onClick={() => onAnnotationClick?.(bubbleAnnotations[0])}
                      count={bubbleAnnotations.length}
                    />
                  )}
                </div>
              )}
              
              <ChatBubbleWrapper
                bubble={bubble}
                courseType={courseType}
                codeTheme={codeTheme}
                canAnnotate={isAdmin}
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
    const openAnnotations = contentAnnotations.filter(a => a.status === "open");
    
    return (
      <div
        ref={contentRef}
        className="prose prose-lg max-w-none relative"
        onMouseUp={() => handleTextSelection("paragraph")}
      >
        {showAnnotations && contentAnnotations.length > 0 && (
          <div className="absolute -top-3 right-0 flex gap-1.5 z-10">
            {openAnnotations.length > 0 ? (
              <AnnotationIndicator 
                annotation={openAnnotations[0]}
                onClick={() => onAnnotationClick?.(openAnnotations[0])}
                count={openAnnotations.length}
              />
            ) : (
              contentAnnotations.length > 0 && (
                <AnnotationIndicator 
                  annotation={contentAnnotations[0]}
                  onClick={() => onAnnotationClick?.(contentAnnotations[0])}
                  count={contentAnnotations.length}
                />
              )
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
                <div className="absolute -top-3 right-0 flex gap-1.5 z-10">
                  <AnnotationIndicator 
                    annotation={partAnnotations[0]}
                    onClick={() => onAnnotationClick?.(partAnnotations[0])}
                    count={partAnnotations.length}
                  />
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