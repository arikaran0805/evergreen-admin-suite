import { useState, useRef, useEffect } from "react";
import { ChatMessage, CourseCharacter, MENTOR_CHARACTER } from "./types";
import { cn } from "@/lib/utils";
import { Check, X, Bold, Italic, Code, List, ListOrdered, Heading2, Quote, Link, Image, Terminal, ChevronDown } from "lucide-react";
import { renderCourseIcon } from "./utils";
import CodeBlock from "./CodeBlock";
import { Button } from "@/components/ui/button";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
                ? "bg-emerald-200/50 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200"
                : "bg-slate-200/70 dark:bg-slate-700/70 text-slate-800 dark:text-slate-200"
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
          isMentor ? "bg-gradient-to-br from-emerald-400 to-emerald-600" : "bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700"
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
          isMentor
            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 rounded-br-md"
            : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md",
          isDragging && "ring-2 ring-primary/50"
        )}
      >

        {/* Speaker name (subtle) */}
        <div
          className={cn(
            "text-[10px] font-medium mb-1 opacity-70 flex items-center gap-1",
            isMentor ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-400"
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
                "w-full min-h-[100px] min-w-[200px] bg-transparent resize outline-none text-sm leading-relaxed border rounded-lg p-2",
                "overflow-auto",
                isMentor 
                  ? "text-emerald-900 dark:text-emerald-100 placeholder:text-emerald-600 border-emerald-300/50 bg-emerald-50/50 dark:bg-emerald-900/30" 
                  : "text-slate-900 dark:text-slate-100 border-slate-300/50 dark:border-slate-600/50 bg-white/50 dark:bg-slate-900/30"
              )}
              style={{ maxWidth: '100%', maxHeight: '500px' }}
              placeholder="Type your message..."
            />
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
