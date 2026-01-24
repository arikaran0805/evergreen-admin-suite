/**
 * ExecutableCodeBlockView - TipTap NodeView for interactive code blocks
 * 
 * Renders an editable, executable code block with language selection,
 * matching chat bubble code blocks exactly.
 * 
 * ROLES: All users can edit and execute code (editing code ≠ editing content)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Copy, Check, Play, Loader2, X, Pencil,
  ChevronUp, ChevronDown 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Prism from '@/lib/prism';

// Supported languages for execution
const EXECUTABLE_LANGUAGES = ['python', 'javascript', 'typescript'];

// All available languages
const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'plaintext', label: 'Plain Text' },
];

const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  html: 'markup',
  xml: 'markup',
  shell: 'bash',
  sh: 'bash',
};

const ExecutableCodeBlockView = ({ 
  node, 
  updateAttributes, 
  editor,
  deleteNode,
}: NodeViewProps) => {
  const { language = 'python', code = '' } = node.attrs;
  
  const [editedCode, setEditedCode] = useState(code);
  const [isEditingCode, setIsEditingCode] = useState(false); // Toggle between view/edit
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputError, setOutputError] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(true);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  
  const normalizedLang = LANGUAGE_MAP[language?.toLowerCase()] || language?.toLowerCase() || 'plaintext';
  const canExecute = EXECUTABLE_LANGUAGES.includes(normalizedLang);
  const isEditable = editor?.isEditable ?? true;

  // Sync code when node attrs change externally
  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  // Apply syntax highlighting when not editing code
  useEffect(() => {
    if (codeRef.current && !isEditingCode) {
      Prism.highlightElement(codeRef.current);
    }
  }, [editedCode, normalizedLang, isEditingCode]);

  // Auto-resize textarea when editing
  useEffect(() => {
    if (textareaRef.current && isEditingCode) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedCode, isEditingCode]);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setEditedCode(newCode);
    updateAttributes({ code: newCode });
  }, [updateAttributes]);

  const handleLanguageChange = useCallback((newLang: string) => {
    updateAttributes({ language: newLang });
  }, [updateAttributes]);

  const handleEditToggle = () => {
    if (isEditingCode) {
      // Exiting edit mode - save changes
      updateAttributes({ code: editedCode });
    }
    setIsEditingCode(!isEditingCode);
    if (!isEditingCode) {
      // Entering edit mode - focus textarea
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingCode(false);
    setEditedCode(code); // Reset to original
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleRun = async () => {
    if (!canExecute) return;
    
    setIsRunning(true);
    setOutput(null);
    setOutputError(false);
    setShowOutput(true);
    setOutputExpanded(true);

    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: { code: editedCode, language: normalizedLang },
      });

      if (error) {
        setOutput(error.message || 'Execution failed');
        setOutputError(true);
      } else if (data?.error) {
        setOutput(data.error);
        setOutputError(true);
      } else {
        setOutput(data?.output || 'No output');
        setOutputError(false);
      }
    } catch (err: any) {
      setOutput(err.message || 'Failed to execute code');
      setOutputError(true);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCloseOutput = () => {
    setShowOutput(false);
    setOutput(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = editedCode.substring(0, start) + '  ' + editedCode.substring(end);
      setEditedCode(newCode);
      updateAttributes({ code: newCode });
      // Reset cursor position after state update
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
    
    // Prevent TipTap from capturing arrow keys and other navigation
    e.stopPropagation();
  };

  return (
    <NodeViewWrapper className="executable-code-block my-4" data-type="executableCodeBlock">
      <div className="group relative">
        {/* Close button - floating top-right corner, only in edit mode */}
        {isEditable && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteNode()}
            className="absolute -top-2 -right-2 z-10 h-6 w-6 rounded-full bg-background border border-border shadow-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove code block"
          >
            <X className="w-3 h-3" />
          </Button>
        )}

        <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
          {/* Header: Language selector + Actions */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/50">
            {/* Language Selector */}
            {isEditable ? (
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="h-7 w-[130px] text-xs border-none bg-transparent focus:ring-0">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.value} value={lang.value} className="text-xs">
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {language}
              </span>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              {/* Edit/Cancel button - only when editor is editable */}
              {isEditable && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isEditingCode ? handleCancelEdit : handleEditToggle}
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                  title={isEditingCode ? "Cancel edit" : "Edit code"}
                >
                  {isEditingCode ? (
                    <X className="w-3.5 h-3.5" />
                  ) : (
                    <Pencil className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}

              {/* Run button */}
              {canExecute && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  {isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
              
              {/* Copy button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Code Editor/Viewer */}
          <div className="p-4">
            {isEditingCode ? (
              <textarea
                ref={textareaRef}
                value={editedCode}
                onChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                className={cn(
                  "w-full bg-transparent resize-none outline-none text-sm font-mono leading-relaxed",
                  "min-h-[60px] overflow-hidden",
                  "text-foreground placeholder:text-muted-foreground"
                )}
                placeholder="// Write your code here..."
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            ) : (
              <pre className="text-sm font-mono leading-relaxed overflow-x-auto">
                <code ref={codeRef} className={`language-${normalizedLang}`}>
                  {editedCode || '// Write your code here...'}
                </code>
              </pre>
            )}
          </div>
        </div>

        {/* Output Panel */}
        {showOutput && output !== null && (
          <div className="mt-0 rounded-b-xl border border-t-0 border-border bg-muted/30 overflow-hidden -mt-3">
            {/* Output Header */}
            <button
              onClick={() => setOutputExpanded(!outputExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-muted">
                  {outputExpanded ? (
                    <ChevronUp className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  outputError ? "text-destructive" : "text-muted-foreground"
                )}>
                  {outputError ? 'Error' : 'Output'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseOutput();
                }}
                className="h-5 w-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-3 h-3" />
              </Button>
            </button>

            {/* Collapsible Output Content */}
            <div className={cn(
              "grid transition-all duration-200 ease-out",
              outputExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="px-3 pb-3">
                  <pre className={cn(
                    "text-sm font-mono whitespace-pre-wrap overflow-x-auto",
                    outputError ? "text-destructive" : "text-foreground"
                  )}>
                    {output}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Copied toast */}
        {copied && (
          <div className="absolute top-2 right-20 px-2 py-1 text-xs bg-primary text-primary-foreground rounded shadow-lg animate-in fade-in-0 zoom-in-95 z-10">
            Copied!
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default ExecutableCodeBlockView;
