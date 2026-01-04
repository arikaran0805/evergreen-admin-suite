import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChatMessage, TAKEAWAY_ICONS } from "./types";
import { cn } from "@/lib/utils";
import { Check, X, Pencil, Lightbulb, Sparkles, Bold, Italic, Code, List, ListOrdered, Heading2, Quote, Link, Image, ChevronDown, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? '⌘' : 'Ctrl';

const CODE_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
];

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
    const currentValue = textarea.value;
    const selectedText = currentValue.slice(start, end);
    const before = currentValue.slice(0, start);
    const after = currentValue.slice(end);
    
    const newContent = before + prefix + selectedText + suffix + after;
    
    textarea.value = newContent;
    setEditContent(newContent);
    
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
        if (linePrefix === '• ') return `• ${line}`;
        if (linePrefix === '## ') return `## ${line}`;
        if (linePrefix === '> ') return `> ${line}`;
        return `${i + 1}. ${line}`;
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

    if (e.key === "Enter" && isModKey) {
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

            {/* Formatting dropdown and actions */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 border-amber-300/50 hover:bg-amber-100/50 dark:hover:bg-amber-800/30"
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
    <motion.div 
      className="my-8 mx-2"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.22, 1, 0.36, 1],
        delay: 0.1 
      }}
    >
      <motion.div
        initial={{ boxShadow: "0 4px 16px -4px rgba(251,191,36,0.2)" }}
        animate={{ boxShadow: "0 8px 32px -8px rgba(251,191,36,0.3)" }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className={cn(
          "group relative rounded-3xl overflow-hidden",
          "bg-gradient-to-br from-amber-50/90 via-yellow-50/70 to-orange-50/50",
          "dark:from-amber-950/50 dark:via-yellow-950/40 dark:to-orange-950/30",
          "border-2 border-amber-300/60 dark:border-amber-600/40",
          "shadow-[0_8px_32px_-8px_rgba(251,191,36,0.3)] dark:shadow-[0_8px_32px_-8px_rgba(251,191,36,0.15)]",
          "hover:shadow-[0_12px_40px_-8px_rgba(251,191,36,0.4)] dark:hover:shadow-[0_12px_40px_-8px_rgba(251,191,36,0.25)]",
          "transition-all duration-500 ease-out",
          "backdrop-blur-sm"
        )}
      >
        {/* Animated gradient border overlay */}
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-[-2px] rounded-3xl bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 opacity-20 blur-sm" />
        </div>

        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 3px 3px, currentColor 1.5px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>

        {/* Glowing accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 shadow-[0_2px_12px_rgba(251,191,36,0.5)]" />

        {/* Main content wrapper */}
        <div className="relative p-6">
          {/* Header row */}
          <div className="flex items-start gap-4 mb-4">
            {/* Icon container with glow effect */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500 shadow-lg ring-2 ring-white/30 dark:ring-black/20">
                <span className="text-2xl filter drop-shadow-md transform group-hover:scale-110 transition-transform duration-300">{icon}</span>
              </div>
            </div>

            {/* Title section */}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 dark:bg-amber-500/20 backdrop-blur-sm">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    Key Takeaway
                  </span>
                </div>
                <Sparkles className="w-4 h-4 text-amber-400/60 dark:text-amber-500/50 animate-pulse" />
              </div>
              <h4 className="font-bold text-foreground text-lg leading-snug tracking-tight">{title}</h4>
            </div>

            {/* Edit button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-amber-200/50 dark:hover:bg-amber-800/40 hover:scale-105"
              onClick={() => onStartEdit(message.id)}
            >
              <Pencil className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </Button>
          </div>

          {/* Content section */}
          <div className="relative">
            {/* Vertical accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-amber-400 via-yellow-400 to-orange-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
            
            {/* Content text */}
            <div className="pl-5">
              <div className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium tracking-wide">
                {message.content}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom decorative gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-amber-100/30 to-transparent dark:from-amber-900/20 pointer-events-none" />

        {/* Corner decorations */}
        <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-300/40 dark:border-amber-600/30 rounded-tr-xl opacity-60" />
        <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-300/40 dark:border-amber-600/30 rounded-bl-xl opacity-60" />
      </motion.div>
    </motion.div>
  );
};

export default TakeawayBlock;