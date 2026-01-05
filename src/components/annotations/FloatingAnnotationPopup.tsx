import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, X, Send, Code, FileText, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingAnnotationPopupProps {
  selectedText: {
    start: number;
    end: number;
    text: string;
    type?: "paragraph" | "code" | "conversation";
    bubbleIndex?: number;
  } | null;
  onAddAnnotation: (
    selectionStart: number,
    selectionEnd: number,
    selectedText: string,
    comment: string,
    annotationType?: "paragraph" | "code" | "conversation"
  ) => void;
  onClose: () => void;
  isAdmin: boolean;
  isModerator: boolean;
}

const FloatingAnnotationPopup = ({
  selectedText,
  onAddAnnotation,
  onClose,
  isAdmin,
  isModerator,
}: FloatingAnnotationPopupProps) => {
  const [comment, setComment] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const [isExpanded, setIsExpanded] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastRectRef = useRef<DOMRect | null>(null);

  // Calculate position based on selection
  useEffect(() => {
    if (!selectedText) {
      setPosition(null);
      setIsExpanded(false);
      setComment("");
      setPlacement("top");
      lastRectRef.current = null;
      return;
    }

    const update = () => {
      // Capture the selection rect if it's still available (it may disappear after clicking the popup)
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        if (rect && (rect.width !== 0 || rect.height !== 0)) {
          lastRectRef.current = rect;
        }
      }

      const rect = lastRectRef.current;
      if (!rect) {
        setPosition(null);
        return;
      }

      const padding = 12;
      const minHalfWidth = 150; // ~min-w-[280px] / 2 + breathing room
      const popupHeight = isExpanded ? 220 : 50;

      let top = rect.top - popupHeight - 12;
      let nextPlacement: "top" | "bottom" = "top";

      // If popup would go above viewport, position below selection instead
      if (top < padding) {
        top = rect.bottom + 12;
        nextPlacement = "bottom";
      }

      const rawLeft = rect.left + rect.width / 2;
      const left = Math.max(
        padding + minHalfWidth,
        Math.min(window.innerWidth - padding - minHalfWidth, rawLeft)
      );

      setPlacement(nextPlacement);
      setPosition({ top, left });
    };

    const raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [selectedText, isExpanded]);

  // Focus textarea when expanded
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        if (isExpanded && comment.trim()) {
          // Don't close if there's content
          return;
        }
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, isExpanded, comment]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSubmit = () => {
    if (!selectedText || !comment.trim()) return;

    onAddAnnotation(
      selectedText.start,
      selectedText.end,
      selectedText.text,
      comment.trim(),
      selectedText.type
    );

    setComment("");
    setIsExpanded(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getTypeIcon = () => {
    switch (selectedText?.type) {
      case "code":
        return <Code className="h-3 w-3" />;
      case "conversation":
        return <MessageCircle className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getTypeLabel = () => {
    switch (selectedText?.type) {
      case "code":
        return "Code";
      case "conversation":
        return "Chat";
      default:
        return "Text";
    }
  };

  if (!selectedText || !position || (!isAdmin && !isModerator)) {
    return null;
  }

  return (
    <div
      ref={popupRef}
      className={cn(
        "fixed z-[9999] transform -translate-x-1/2",
        "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Arrow pointing to selection */}
      {placement === "top" ? (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-popover drop-shadow-sm" />
        </div>
      ) : (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-popover drop-shadow-sm" />
        </div>
      )}

      <div className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden min-w-[280px] max-w-[400px]">
        {!isExpanded ? (
          // Compact mode - just show add button
          <div className="flex items-center gap-2 p-2">
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 flex-1 justify-start"
              onClick={() => setIsExpanded(true)}
            >
              <MessageSquarePlus className="h-4 w-4 text-primary" />
              <span>Add annotation</span>
            </Button>
            <Badge variant="secondary" className="gap-1 text-xs">
              {getTypeIcon()}
              {getTypeLabel()}
            </Badge>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          // Expanded mode - show form
          <div className="p-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Add annotation</span>
                <Badge variant="secondary" className="gap-1 text-xs">
                  {getTypeIcon()}
                  {getTypeLabel()}
                </Badge>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Selected text preview */}
            <div className="p-2 bg-primary/10 border-l-4 border-primary rounded text-xs line-clamp-2 text-muted-foreground">
              "{selectedText.text}"
            </div>

            {/* Comment input */}
            <Textarea
              ref={textareaRef}
              placeholder="Enter your feedback or suggestion..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] text-sm resize-none"
              rows={3}
            />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                ⌘/Ctrl + Enter to submit
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!comment.trim()}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingAnnotationPopup;
