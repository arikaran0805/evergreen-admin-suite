import { useState, useRef, useEffect } from "react";
import { ChatMessage, TAKEAWAY_ICONS } from "./types";
import { cn } from "@/lib/utils";
import { Check, X, Pencil, Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TakeawayBlockProps {
  message: ChatMessage;
  isEditing: boolean;
  onEdit: (id: string, content: string, title?: string, icon?: string) => void;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
}

const TakeawayBlock = ({
  message,
  isEditing,
  onEdit,
  onStartEdit,
  onEndEdit,
}: TakeawayBlockProps) => {
  const [editContent, setEditContent] = useState(message.content);
  const [editTitle, setEditTitle] = useState(message.takeawayTitle || "One-Line Takeaway for Learners");
  const [editIcon, setEditIcon] = useState(message.takeawayIcon || "🧠");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Helper to wrap selected text with formatting
  const wrapSelection = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editContent.slice(start, end);
    const before = editContent.slice(0, start);
    const after = editContent.slice(end);
    
    const newContent = before + prefix + selectedText + suffix + after;
    setEditContent(newContent);
    
    // Keep selection on the wrapped text for visibility
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start, start + prefix.length + selectedText.length + suffix.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }
    }, 0);
  };

  // Helper to insert text at each line (for lists)
  const insertAtLineStart = (linePrefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editContent.slice(start, end);
    const before = editContent.slice(0, start);
    const after = editContent.slice(end);
    
    let newContent: string;
    if (selectedText) {
      const lines = selectedText.split('\n');
      const prefixedLines = lines.map((line, i) => {
        if (linePrefix === '• ') {
          return `• ${line}`;
        } else {
          return `${i + 1}. ${line}`;
        }
      });
      newContent = before + prefixedLines.join('\n') + after;
    } else {
      newContent = before + linePrefix + after;
    }
    
    setEditContent(newContent);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + linePrefix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Formatting shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      wrapSelection('**', '**');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      wrapSelection('*', '*');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '`') {
      e.preventDefault();
      wrapSelection('`', '`');
      return;
    }
    // Bullet list: Ctrl+Shift+U
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'U') {
      e.preventDefault();
      insertAtLineStart('• ');
      return;
    }
    // Numbered list: Ctrl+Shift+O
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'O') {
      e.preventDefault();
      insertAtLineStart('1. ');
      return;
    }

    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
      return;
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleSave = () => {
    onEdit(message.id, editContent, editTitle, editIcon);
    onEndEdit();
  };

  const handleCancel = () => {
    setEditContent(message.content);
    setEditTitle(message.takeawayTitle || "One-Line Takeaway for Learners");
    setEditIcon(message.takeawayIcon || "🧠");
    onEndEdit();
  };

  if (isEditing) {
    return (
      <div className="my-6 mx-2">
        <div className="relative p-5 rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/40 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/10 shadow-lg">
          {/* Decorative corner accents */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />

          <div className="space-y-4">
            {/* Icon and title row */}
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 w-10 p-0 text-xl rounded-xl border-amber-300 bg-amber-100/50 hover:bg-amber-200/50 dark:bg-amber-900/30 dark:hover:bg-amber-800/40"
                  >
                    {editIcon}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-popover border border-border shadow-lg z-50">
                  <div className="grid grid-cols-4 gap-1 p-2">
                    {TAKEAWAY_ICONS.map((icon) => (
                      <DropdownMenuItem
                        key={icon.value}
                        onClick={() => setEditIcon(icon.value)}
                        className="cursor-pointer justify-center text-xl p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50"
                      >
                        {icon.value}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Takeaway title..."
                className="flex-1 h-10 text-sm font-semibold border-amber-300/50 bg-white/50 dark:bg-background/50 focus-visible:ring-amber-400"
              />
            </div>

            {/* Content textarea */}
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[100px] bg-white/70 dark:bg-background/70 resize-y outline-none text-sm leading-relaxed border border-amber-300/50 rounded-xl p-4 focus:ring-2 focus:ring-amber-400/50"
              placeholder="Enter your key takeaway..."
            />

            {/* Help text and actions */}
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-amber-700/70 dark:text-amber-300/70 flex flex-wrap gap-1">
                <span>Ctrl+Enter save • Ctrl+B bold • Ctrl+` code • Ctrl+Shift+U bullets</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCancel} 
                  className="h-8 px-3 text-xs hover:bg-amber-100 dark:hover:bg-amber-900/30"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  className="h-8 px-4 text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-md"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const icon = message.takeawayIcon || "🧠";
  const title = message.takeawayTitle || "One-Line Takeaway for Learners";

  return (
    <div className="my-6 mx-2">
      <div
        className={cn(
          "group relative rounded-2xl overflow-hidden",
          "bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50/60",
          "dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/20",
          "border border-amber-200/80 dark:border-amber-700/50",
          "shadow-md hover:shadow-lg transition-shadow duration-300"
        )}
      >
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>

        {/* Glowing accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400" />

        {/* Header */}
        <div className="relative flex items-center gap-3 px-5 py-4 border-b border-amber-200/50 dark:border-amber-700/30">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 shadow-md">
            <span className="text-xl filter drop-shadow-sm">{icon}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                Key Takeaway
              </span>
            </div>
            <h4 className="font-bold text-foreground text-base mt-0.5">{title}</h4>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-100 dark:hover:bg-amber-900/30"
            onClick={() => onStartEdit(message.id)}
          >
            <Pencil className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </Button>
        </div>

        {/* Content */}
        <div className="relative px-5 py-4">
          <div className="flex gap-4">
            {/* Decorative side accent */}
            <div className="flex-shrink-0 w-1 rounded-full bg-gradient-to-b from-amber-400 via-yellow-400 to-orange-400" />
            
            {/* Content text */}
            <div className="flex-1">
              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium">
                {message.content}
              </div>
            </div>
          </div>
        </div>

        {/* Decorative sparkle */}
        <Sparkles className="absolute top-4 right-14 w-4 h-4 text-amber-300/50 dark:text-amber-500/30" />
      </div>
    </div>
  );
};

export default TakeawayBlock;