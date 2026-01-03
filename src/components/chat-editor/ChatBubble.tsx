import { useState, useRef, useEffect } from "react";
import { ChatMessage, CourseCharacter, MENTOR_CHARACTER } from "./types";
import { cn } from "@/lib/utils";
import { Check, X, Bold, Italic, Code, List, ListOrdered, Heading2, Quote, Link, Image, Terminal, ChevronDown, Eye, EyeOff, Columns, PanelLeft, Maximize2, Minimize2 } from "lucide-react";
import { renderCourseIcon } from "./utils";
import CodeBlock from "./CodeBlock";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { getChatColors } from "./chatColors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? '⌘' : 'Ctrl';

const CODE_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash/Shell" },
  { value: "r", label: "R" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
];

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
  const [viewModeState, setViewModeState] = useState<'edit' | 'preview' | 'split'>('edit');
  const [isViewModeInitialized, setIsViewModeInitialized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [splitViewHeight, setSplitViewHeight] = useState(150);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const splitViewDragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // Load view mode from localStorage only once on mount
  useEffect(() => {
    const saved = localStorage.getItem('chatBubbleViewMode');
    if (saved === 'edit' || saved === 'preview' || saved === 'split') {
      setViewModeState(saved);
    }
    setIsViewModeInitialized(true);
  }, []);

  // Persist view mode preference
  const handleViewModeChange = (mode: 'edit' | 'preview' | 'split') => {
    setViewModeState(mode);
    localStorage.setItem('chatBubbleViewMode', mode);
  };
  
  // Use default 'edit' until initialized to prevent flicker
  const viewMode = isViewModeInitialized ? viewModeState : 'edit';

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [isEditing]);

  // Helper to wrap selected text with formatting
  const wrapSelection = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value; // Use DOM value directly
    const selectedText = currentValue.slice(start, end);
    const before = currentValue.slice(0, start);
    const after = currentValue.slice(end);
    
    const newContent = before + prefix + selectedText + suffix + after;
    
    // Update DOM directly first for immediate effect
    textarea.value = newContent;
    setEditContent(newContent);
    
    // Set cursor position immediately
    const newCursorPos = selectedText 
      ? start + prefix.length + selectedText.length + suffix.length
      : start + prefix.length;
    textarea.setSelectionRange(
      selectedText ? start : newCursorPos, 
      newCursorPos
    );
    textarea.focus();
  };

  // Helper to insert text at each line (for lists)
  const insertAtLineStart = (linePrefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    const selectedText = currentValue.slice(start, end);
    const before = currentValue.slice(0, start);
    const after = currentValue.slice(end);
    
    let newContent: string;
    if (selectedText) {
      const lines = selectedText.split('\n');
      const prefixedLines = lines.map((line, i) => {
        if (linePrefix === '• ') {
          return `• ${line}`;
        } else if (linePrefix === '## ') {
          return `## ${line}`;
        } else if (linePrefix === '> ') {
          return `> ${line}`;
        } else {
          return `${i + 1}. ${line}`;
        }
      });
      newContent = before + prefixedLines.join('\n') + after;
    } else {
      newContent = before + linePrefix + after;
    }
    
    textarea.value = newContent;
    setEditContent(newContent);
    
    const newCursorPos = start + linePrefix.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.focus();
  };

  const insertCodeBlock = (language: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const currentValue = textarea.value;
    const before = currentValue.slice(0, start);
    const after = currentValue.slice(start);
    
    const codeBlock = `\`\`\`${language}\n# Your code here\n\n\`\`\``;
    const newContent = before + (before && !before.endsWith('\n') ? '\n' : '') + codeBlock + after;
    
    textarea.value = newContent;
    setEditContent(newContent);
    textarea.focus();
  };

  const insertLink = () => {
    wrapSelection('[', '](https://example.com)');
  };

  const insertImage = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const currentValue = textarea.value;
    const before = currentValue.slice(0, start);
    const after = currentValue.slice(start);
    
    const imageMarkdown = '![Image description](https://example.com/image.png)';
    const newContent = before + imageMarkdown + after;
    
    textarea.value = newContent;
    setEditContent(newContent);
    textarea.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isModKey = isMac ? e.metaKey : e.ctrlKey;
    
    // Bold: Ctrl/Cmd + B
    if (isModKey && e.key.toLowerCase() === 'b' && !e.shiftKey) {
      e.preventDefault();
      wrapSelection('**', '**');
      return;
    }
    // Italic: Ctrl/Cmd + I
    if (isModKey && e.key.toLowerCase() === 'i' && !e.shiftKey) {
      e.preventDefault();
      wrapSelection('*', '*');
      return;
    }
    // Inline Code: Ctrl/Cmd + `
    if (isModKey && e.key === '`') {
      e.preventDefault();
      wrapSelection('`', '`');
      return;
    }
    // Bullet list: Ctrl+Shift+U
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      insertAtLineStart('• ');
      return;
    }
    // Numbered list: Ctrl+Shift+O
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      insertAtLineStart('1. ');
      return;
    }
    // Heading: Ctrl+Shift+H
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      insertAtLineStart('## ');
      return;
    }
    // Quote: Ctrl+Shift+Q
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      insertAtLineStart('> ');
      return;
    }
    // Link: Ctrl+K
    if (isModKey && e.key.toLowerCase() === 'k' && !e.shiftKey) {
      e.preventDefault();
      insertLink();
      return;
    }
    // Code block: Ctrl+Shift+C
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      insertCodeBlock('python');
      return;
    }
    // Image: Ctrl+Shift+I
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertImage();
      return;
    }
    
    // Enter saves. Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEdit(message.id, editContent);
      onEndEdit();
      return;
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

  // Parse inline markdown formatting (bold, italic, inline code, headings, lists, etc.)
  const parseInlineMarkdown = (text: string, baseKey: string): React.ReactNode[] => {
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
        segments.push(
          <code
            key={`${baseKey}-code-${match.index}`}
            className={cn(
              "px-1.5 py-0.5 rounded text-xs font-mono",
              isMentor
                ? "bg-emerald-200/50 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200"
                : "bg-slate-200/70 dark:bg-slate-700/70 text-slate-800 dark:text-slate-200"
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
  const parseLineMarkdown = (text: string, baseKey: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    
    lines.forEach((line, lineIdx) => {
      const lineKey = `${baseKey}-line-${lineIdx}`;
      
      // Heading: ## text
      if (line.match(/^##\s+(.+)$/)) {
        const headingContent = line.replace(/^##\s+/, '');
        result.push(
          <h2 key={lineKey} className="text-base font-bold mt-2 mb-1">
            {parseInlineMarkdown(headingContent, lineKey)}
          </h2>
        );
      }
      // Blockquote: > text
      else if (line.match(/^>\s+(.+)$/)) {
        const quoteContent = line.replace(/^>\s+/, '');
        result.push(
          <blockquote key={lineKey} className={cn(
            "border-l-2 pl-3 my-1 italic",
            isMentor ? "border-emerald-400" : "border-slate-400"
          )}>
            {parseInlineMarkdown(quoteContent, lineKey)}
          </blockquote>
        );
      }
      // Bullet list: • text or - text
      else if (line.match(/^[•\-]\s+(.+)$/)) {
        const listContent = line.replace(/^[•\-]\s+/, '');
        result.push(
          <div key={lineKey} className="flex items-start gap-2 ml-1">
            <span className="text-sm">•</span>
            <span>{parseInlineMarkdown(listContent, lineKey)}</span>
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
              <span>{parseInlineMarkdown(match[2], lineKey)}</span>
            </div>
          );
        }
      }
      // Regular text with inline formatting
      else if (line.trim()) {
        result.push(
          <span key={lineKey}>
            {parseInlineMarkdown(line, lineKey)}
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

  // Parse content for code blocks and inline markdown
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

    return parts.map((part, idx) => {
      if (part.type === "code") {
        return (
          <div key={idx} className="-mx-4 px-0">
            <CodeBlock
              code={part.content}
              language={part.language}
              isMentorBubble={isMentor}
              overrideTheme={codeTheme}
              editable
            />
          </div>
        );
      }
      return <span key={idx}>{parseLineMarkdown(part.content, `part-${idx}`)}</span>;
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
          getChatColors(isMentor).avatar
        )}
      >
        {renderCourseIcon(character.emoji, 18)}
      </div>

      {/* Bubble - expand to full width when editing */}
      <div
        className={cn(
          "relative px-4 py-2.5 rounded-2xl shadow-sm",
          "transition-all duration-200",
          isEditing 
            ? "flex-1 max-w-full" 
            : "max-w-[70%] min-w-[60px]",
          getChatColors(isMentor).bubble,
          getChatColors(isMentor).text,
          isMentor ? "rounded-br-md" : "rounded-bl-md",
          isDragging && "ring-2 ring-primary/50"
        )}
      >

        {/* Speaker name (subtle) */}
        <div
          className={cn(
            "text-[10px] font-medium mb-1 opacity-70 flex items-center gap-1",
            getChatColors(isMentor).speaker
          )}
        >
          {character.name} {renderCourseIcon(character.emoji, 12)}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            {/* View mode toggle buttons */}
            <div className="flex items-center justify-end gap-1 mb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewModeChange('edit')}
                className={cn(
                  "h-6 px-2 text-xs gap-1",
                  viewMode === 'edit' && getChatColors(isMentor).buttonActive,
                  getChatColors(isMentor).speaker,
                  getChatColors(isMentor).buttonHover
                )}
              >
                <EyeOff className="w-3 h-3" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewModeChange('split')}
                className={cn(
                  "h-6 px-2 text-xs gap-1",
                  viewMode === 'split' && getChatColors(isMentor).buttonActive,
                  getChatColors(isMentor).speaker,
                  getChatColors(isMentor).buttonHover
                )}
              >
                <Columns className="w-3 h-3" />
                Split
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewModeChange('preview')}
                className={cn(
                  "h-6 px-2 text-xs gap-1",
                  viewMode === 'preview' && getChatColors(isMentor).buttonActive,
                  getChatColors(isMentor).speaker,
                  getChatColors(isMentor).buttonHover
                )}
              >
                <Eye className="w-3 h-3" />
                Preview
              </Button>
            </div>
            
            {/* Editor / Preview based on view mode */}
            {viewMode === 'split' ? (
              <div className="relative">
                <ResizablePanelGroup 
                  direction="horizontal" 
                  className="rounded-lg border border-border/50"
                  style={{ height: `${splitViewHeight}px` }}
                >
                  {/* Editor panel */}
                  <ResizablePanel defaultSize={50} minSize={25}>
                    <textarea
                      ref={textareaRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className={cn(
                        "w-full h-full bg-transparent resize-none outline-none text-sm leading-relaxed p-2",
                        "overflow-auto",
                        isMentor 
                          ? "text-emerald-900 dark:text-emerald-100 placeholder:text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/30" 
                          : "text-slate-900 dark:text-slate-100 bg-white/50 dark:bg-slate-900/30"
                      )}
                      placeholder="Type your message..."
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  {/* Preview panel */}
                  <ResizablePanel defaultSize={50} minSize={25}>
                    <div 
                      className={cn(
                        "w-full h-full text-sm leading-relaxed p-3 overflow-auto",
                        isMentor 
                          ? "bg-emerald-50/30 dark:bg-emerald-900/20" 
                          : "bg-white/30 dark:bg-slate-900/20"
                      )}
                    >
                      {editContent ? renderContent(editContent) : (
                        <span className="text-muted-foreground italic">Preview...</span>
                      )}
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
                {/* Draggable resize handle at bottom right corner */}
                <div
                  className="absolute bottom-0 right-0 cursor-nwse-resize opacity-40 hover:opacity-70 transition-opacity z-50 p-1.5 select-none"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    splitViewDragRef.current = { startY: e.clientY, startHeight: splitViewHeight };
                    
                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      if (!splitViewDragRef.current) return;
                      const deltaY = moveEvent.clientY - splitViewDragRef.current.startY;
                      const newHeight = Math.max(100, Math.min(500, splitViewDragRef.current.startHeight + deltaY));
                      setSplitViewHeight(newHeight);
                    };
                    
                    const handleMouseUp = () => {
                      splitViewDragRef.current = null;
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  title="Drag to resize"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" className="text-muted-foreground">
                    <path
                      d="M10 2L2 10M10 6L6 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            ) : viewMode === 'preview' ? (
              <div 
                className={cn(
                  "w-full min-h-[100px] text-sm leading-relaxed border rounded-lg p-3 overflow-auto",
                  isMentor 
                    ? "border-emerald-300/50 bg-emerald-50/30 dark:bg-emerald-900/20" 
                    : "border-slate-300/50 dark:border-slate-600/50 bg-white/30 dark:bg-slate-900/20"
                )}
                style={{ maxHeight: '500px' }}
              >
                {editContent ? renderContent(editContent) : (
                  <span className="text-muted-foreground italic">Nothing to preview...</span>
                )}
              </div>
            ) : (
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "w-full min-w-[200px] bg-transparent resize outline-none text-sm leading-relaxed border rounded-lg p-2 pr-8",
                    "overflow-auto transition-all duration-200",
                    isExpanded ? "min-h-[300px]" : "min-h-[100px]",
                    isMentor 
                      ? "text-emerald-900 dark:text-emerald-100 placeholder:text-emerald-600 border-emerald-300/50 bg-emerald-50/50 dark:bg-emerald-900/30" 
                      : "text-slate-900 dark:text-slate-100 border-slate-300/50 dark:border-slate-600/50 bg-white/50 dark:bg-slate-900/30"
                  )}
                  style={{ maxWidth: '100%', maxHeight: isExpanded ? '600px' : '500px' }}
                  placeholder="Type your message..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={cn(
                    "absolute top-1 right-1 h-6 w-6 opacity-60 hover:opacity-100",
                    isMentor 
                      ? "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50" 
                      : "text-slate-600 dark:text-slate-400"
                  )}
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </Button>
              </div>
            )}
            {/* Formatting dropdown */}
            <div className="flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 px-2 text-xs gap-1",
                      isMentor 
                        ? "border-emerald-300/50 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50" 
                        : "border-slate-300/50 dark:border-slate-600/50"
                    )}
                  >
                    <Bold className="w-3 h-3" />
                    Format
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-popover border border-border shadow-lg z-50">
                  <DropdownMenuItem onClick={() => wrapSelection('**', '**')} className="cursor-pointer">
                    <Bold className="w-4 h-4 mr-2" />
                    Bold
                    <DropdownMenuShortcut>{modKey}+B</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => wrapSelection('*', '*')} className="cursor-pointer">
                    <Italic className="w-4 h-4 mr-2" />
                    Italic
                    <DropdownMenuShortcut>{modKey}+I</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => wrapSelection('`', '`')} className="cursor-pointer">
                    <Terminal className="w-4 h-4 mr-2" />
                    Inline Code
                    <DropdownMenuShortcut>{modKey}+`</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => insertAtLineStart('• ')} className="cursor-pointer">
                    <List className="w-4 h-4 mr-2" />
                    Bullet List
                    <DropdownMenuShortcut>{modKey}+⇧+U</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertAtLineStart('1. ')} className="cursor-pointer">
                    <ListOrdered className="w-4 h-4 mr-2" />
                    Numbered List
                    <DropdownMenuShortcut>{modKey}+⇧+O</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertAtLineStart('## ')} className="cursor-pointer">
                    <Heading2 className="w-4 h-4 mr-2" />
                    Heading
                    <DropdownMenuShortcut>{modKey}+⇧+H</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertAtLineStart('> ')} className="cursor-pointer">
                    <Quote className="w-4 h-4 mr-2" />
                    Blockquote
                    <DropdownMenuShortcut>{modKey}+⇧+Q</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={insertLink} className="cursor-pointer">
                    <Link className="w-4 h-4 mr-2" />
                    Link
                    <DropdownMenuShortcut>{modKey}+K</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={insertImage} className="cursor-pointer">
                    <Image className="w-4 h-4 mr-2" />
                    Image
                    <DropdownMenuShortcut>{modKey}+⇧+I</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <Code className="w-4 h-4 mr-2" />
                      Code Block
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="bg-popover border border-border shadow-lg z-50">
                        {CODE_LANGUAGES.map((lang) => (
                          <DropdownMenuItem
                            key={lang.value}
                            onClick={() => insertCodeBlock(lang.value)}
                            className="cursor-pointer"
                          >
                            {lang.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
              <span className={cn(
                "text-[10px] opacity-60",
                isMentor ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-400"
              )}>
                Enter save • Shift+Enter newline
              </span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className={cn(
                  "h-7 px-2 text-xs",
                  isMentor ? "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50" : ""
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
                  isMentor 
                    ? "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 bg-emerald-200/30 dark:bg-emerald-800/30" 
                    : "bg-primary/10"
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
              isMentor ? "text-emerald-700 dark:text-emerald-300 text-right" : "text-slate-600 dark:text-slate-400"
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
