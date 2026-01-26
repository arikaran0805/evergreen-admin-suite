/**
 * ExecutableCodeBlockView - TipTap NodeView for interactive code blocks
 * 
 * Renders an editable, executable code block with language selection,
 * matching chat bubble code blocks exactly.
 * 
 * ROLES: All users can edit and execute code (editing code ≠ editing content)
 */

import { useState, useRef, useEffect, useCallback, useId } from 'react';
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
import { useCodeTheme } from '@/hooks/useCodeTheme';
import { useCodeEdit } from '@/contexts/CodeEditContext';

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
  const { theme: codeTheme } = useCodeTheme();
  
  // Generate stable ID for this code block instance
  const instanceId = useId();
  
  // Get code edit context (may be undefined if not wrapped in provider)
  let codeEditContext: ReturnType<typeof useCodeEdit> | null = null;
  try {
    codeEditContext = useCodeEdit();
  } catch {
    // Context not available - that's okay, we just won't track edits
  }
  
  const [editedCode, setEditedCode] = useState(code);
  const [isEditingCode, setIsEditingCode] = useState(false); // Toggle between view/edit
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputError, setOutputError] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(true);
  
  // Store original code for comparison (code edit context tracking)
  const [originalCode] = useState(code);
  
  // Store code snapshot when entering edit mode (for cancel/revert)
  const [codeBeforeEdit, setCodeBeforeEdit] = useState(code);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  
  const normalizedLang = LANGUAGE_MAP[language?.toLowerCase()] || language?.toLowerCase() || 'plaintext';
  const canExecute = EXECUTABLE_LANGUAGES.includes(normalizedLang);
  const isEditable = editor?.isEditable ?? true;

  // Sync code when node attrs change externally
  useEffect(() => {
    setEditedCode(code);
  }, [code]);
  
  // Report code edits to context
  useEffect(() => {
    if (codeEditContext) {
      codeEditContext.reportCodeEdit(instanceId, editedCode, originalCode, language);
    }
  }, [editedCode, originalCode, language, instanceId, codeEditContext]);

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
    if (!isEditingCode) {
      // Entering edit mode - snapshot current code for potential revert
      setCodeBeforeEdit(code);
      setIsEditingCode(true);
      // Focus textarea and place cursor at end of code
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 0);
    } else {
      // Exiting via toggle (X button) - revert to snapshot
      setEditedCode(codeBeforeEdit);
      updateAttributes({ code: codeBeforeEdit });
      setIsEditingCode(false);
    }
  };

  const handleCancelEdit = () => {
    // Revert to code snapshot from before editing started
    setEditedCode(codeBeforeEdit);
    updateAttributes({ code: codeBeforeEdit });
    setIsEditingCode(false);
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
    <NodeViewWrapper className="executable-code-block-wrapper my-2" data-type="executableCodeBlock">
      <div className="group relative w-full">
        {/* Close button - floating top-right corner, only in edit mode */}
        {isEditable && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteNode()}
            className="absolute -top-1.5 -right-1.5 z-10 h-5 w-5 rounded-full bg-background border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove code block"
          >
            <X className="w-2.5 h-2.5" />
          </Button>
        )}

        {/* Single flat container - no nested inner box */}
        <div className={cn("rounded-lg border border-border/50 bg-muted/20 overflow-hidden", `code-theme-${codeTheme}`)}>
          {/* Header row */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            {/* Language Label */}
            {isEditable ? (
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="h-5 w-auto gap-0.5 px-0 text-[11px] uppercase tracking-wider font-medium text-muted-foreground border-none bg-transparent shadow-none focus:ring-0 hover:text-foreground">
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
              <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                {language}
              </span>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={isEditingCode ? handleCancelEdit : handleEditToggle}
                className="h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
                title={isEditingCode ? "Cancel edit" : "Edit code"}
              >
                {isEditingCode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              </Button>

              {canExecute && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="h-7 w-7 text-muted-foreground/60 hover:text-primary hover:bg-transparent"
                  title="Run code"
                >
                  {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Code content - directly in container, no inner box */}
          <div className="px-4 pb-4">
            {isEditingCode ? (
              <textarea
                ref={textareaRef}
                value={editedCode}
                onChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                className={cn(
                  "w-full bg-transparent resize-none outline-none text-sm font-mono leading-relaxed",
                  "min-h-[1.5em] overflow-hidden",
                  "text-foreground placeholder:text-muted-foreground/60"
                )}
                placeholder="// Write your code here..."
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            ) : (
              <pre className="text-sm font-mono leading-relaxed overflow-x-auto w-full m-0 bg-transparent">
                <code ref={codeRef} className={`language-${normalizedLang}`}>
                  {editedCode || '// Write your code here...'}
                </code>
              </pre>
            )}
          </div>
        </div>

        {/* Output panel - matches chat bubble CodeBlock styling */}
        {showOutput && (
          <div className="mt-0.5 rounded-t-none rounded-b-xl border border-t-0 border-border/50 bg-muted/50 overflow-hidden">
            {/* Header row */}
            <button
              onClick={() => setOutputExpanded(!outputExpanded)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted/60">
                  {outputExpanded ? (
                    <ChevronUp className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  outputError ? "text-destructive" : "text-foreground"
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
                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </button>

            {/* Content area - flat text, no inner box */}
            <div className={cn(
              "grid transition-all duration-200 ease-out",
              outputExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="px-4 pb-4">
                  <pre className={cn(
                    "text-sm font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto m-0",
                    outputError ? "text-destructive" : "text-foreground",
                    !output && "text-muted-foreground"
                  )}>
                    {output || 'No output'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Copied toast */}
        {copied && (
          <div className="absolute top-0 right-16 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded shadow-sm animate-in fade-in-0 zoom-in-95 z-10">
            Copied!
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default ExecutableCodeBlockView;
