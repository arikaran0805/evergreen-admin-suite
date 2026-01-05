import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import { Copy, Check, Play, Pencil, Loader2, X, ChevronDown, Lightbulb, Eye, EyeOff, Columns, Keyboard, Bold, Italic, Underline, Strikethrough, Code, Link, Highlighter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? '⌘' : 'Ctrl';

const SUPPORTED_LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'css', label: 'CSS' },
  { value: 'markup', label: 'HTML' },
];

const KEYBOARD_SHORTCUTS = [
  { keys: `${modKey}+B`, action: 'Bold' },
  { keys: `${modKey}+I`, action: 'Italic' },
  { keys: `${modKey}+U`, action: 'Underline' },
  { keys: `${modKey}+⇧+S`, action: 'Strikethrough' },
  { keys: `${modKey}+\``, action: 'Code Block' },
  { keys: `${modKey}+⇧+Q`, action: 'Blockquote' },
  { keys: `${modKey}+⇧+L`, action: 'Bullet List' },
  { keys: `${modKey}+⇧+O`, action: 'Numbered List' },
  { keys: `${modKey}+⇧+1`, action: 'Heading 1' },
  { keys: `${modKey}+⇧+2`, action: 'Heading 2' },
  { keys: `${modKey}+⇧+3`, action: 'Heading 3' },
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  annotationMode?: boolean;
  onTextSelect?: (selection: {
    start: number;
    end: number;
    text: string;
    type: "paragraph" | "code";
  }) => void;
}

interface CodeBlockOverlay {
  element: HTMLPreElement;
  rect: DOMRect;
  code: string;
  language: string;
}

const RichTextEditor = ({ value, onChange, placeholder, annotationMode, onTextSelect }: RichTextEditorProps) => {
  const quillRef = useRef<ReactQuill>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shortcutListenerRootRef = useRef<HTMLElement | null>(null);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlockOverlay[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [runningIndex, setRunningIndex] = useState<number | null>(null);
  const [outputs, setOutputs] = useState<Record<number, { text: string; error: boolean }>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedCode, setEditedCode] = useState("");
  const [languageOverrides, setLanguageOverrides] = useState<Record<number, string>>({});
  
  // View mode state (edit, preview, split)
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>(() => {
    const saved = localStorage.getItem('richTextEditorViewMode');
    return (saved === 'edit' || saved === 'preview' || saved === 'split') ? saved : 'edit';
  });
  const [splitViewHeight, setSplitViewHeight] = useState(300);
  const splitViewDragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  
  // Takeaway dialog state
  const [showTakeawayDialog, setShowTakeawayDialog] = useState(false);
  const [takeawayTitle, setTakeawayTitle] = useState("");
  const [takeawayItems, setTakeawayItems] = useState("");
  
  // Floating toolbar state
  const [floatingToolbar, setFloatingToolbar] = useState<{
    visible: boolean;
    x: number;
    y: number;
    formats: Record<string, any>;
  }>({ visible: false, x: 0, y: 0, formats: {} });
  
  // Handle view mode change with persistence
  const handleViewModeChange = (mode: 'edit' | 'preview' | 'split') => {
    setViewMode(mode);
    localStorage.setItem('richTextEditorViewMode', mode);
  };
  
  // Stable onChange handler
  const handleChange = useCallback(
    (content: string) => {
      onChange(content);
    },
    [onChange]
  );

  /**
   * IMPORTANT: Quill code blocks must remain plain text nodes.
   * Injecting Prism token spans into `pre.ql-syntax` breaks cursor placement / selection.
   * We normalize older content that may have been tokenized.
   */
  const hasNormalizedOnce = useRef(false);

  const normalizeCodeBlocksIfNeeded = useCallback(() => {
    if (!containerRef.current) return;

    const editorRoot = containerRef.current.querySelector('.ql-editor');
    if (!editorRoot) return;

    const pres = editorRoot.querySelectorAll<HTMLPreElement>('pre.ql-syntax');
    let changed = false;

    pres.forEach((pre) => {
      if (pre.querySelector('.token')) {
        const text = pre.textContent ?? '';
        pre.innerHTML = '';
        pre.textContent = text;
        changed = true;
      }
    });

    if (changed) {
      const quill = quillRef.current?.getEditor();
      quill?.update('silent');
    }
  }, []);

  // Note: handleEditorFocus is defined after updateCodeBlockPositions to avoid hoisting issues

  // Update floating toolbar position and visibility
  const updateFloatingToolbar = useCallback(() => {
    // Hide floating toolbar when annotation mode is active
    if (annotationMode) {
      setFloatingToolbar(prev => ({ ...prev, visible: false }));
      return;
    }
    
    const quill = quillRef.current?.getEditor();
    if (!quill) {
      setFloatingToolbar(prev => ({ ...prev, visible: false }));
      return;
    }

    const selection = quill.getSelection();
    if (!selection || selection.length === 0) {
      setFloatingToolbar(prev => ({ ...prev, visible: false }));
      return;
    }

    const formats = quill.getFormat(selection);
    const bounds = quill.getBounds(selection.index, selection.length);
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (bounds && containerRect) {
      // Position above the selection
      const x = bounds.left + bounds.width / 2;
      const y = bounds.top - 45;
      
      setFloatingToolbar({
        visible: true,
        x,
        y,
        formats,
      });
    }
  }, [annotationMode]);

  // Handle text selection for annotations
  const handleTextSelection = useCallback(() => {
    // Update floating toolbar
    updateFloatingToolbar();

    if (!onTextSelect) return;

    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const selection = quill.getSelection();
    if (!selection || selection.length === 0) return;

    const text = quill.getText(selection.index, selection.length).trim();
    if (!text || text.length < 2) return;

    const formats = quill.getFormat(selection);
    const type: "paragraph" | "code" = formats["code-block"] ? "code" : "paragraph";

    onTextSelect({
      start: selection.index,
      end: selection.index + selection.length,
      text,
      type,
    });
  }, [onTextSelect, updateFloatingToolbar]);

  // Apply format from floating toolbar
  const applyFormat = useCallback((format: string, value?: any) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    
    const currentFormat = quill.getFormat();
    quill.format(format, value !== undefined ? value : !currentFormat[format]);
    
    // Update toolbar state after formatting
    setTimeout(updateFloatingToolbar, 10);
  }, [updateFloatingToolbar]);

  // Hide floating toolbar on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.floating-toolbar') && !target.closest('.ql-editor')) {
        setFloatingToolbar(prev => ({ ...prev, visible: false }));
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFloatingToolbar(prev => ({ ...prev, visible: false }));
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Keyboard shortcuts handler
  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    if (!modKey) return;

    const format = quill.getFormat();

    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault();
        quill.format('bold', !format.bold);
        break;
      case 'i':
        e.preventDefault();
        quill.format('italic', !format.italic);
        break;
      case 'u':
        e.preventDefault();
        quill.format('underline', !format.underline);
        break;
      case 's':
        if (e.shiftKey) {
          e.preventDefault();
          quill.format('strike', !format.strike);
        }
        break;
      case '`':
        e.preventDefault();
        quill.format('code-block', !format['code-block']);
        break;
      case 'q':
        if (e.shiftKey) {
          e.preventDefault();
          quill.format('blockquote', !format.blockquote);
        }
        break;
      case '1':
        if (e.shiftKey) {
          e.preventDefault();
          quill.format('header', format.header === 1 ? false : 1);
        }
        break;
      case '2':
        if (e.shiftKey) {
          e.preventDefault();
          quill.format('header', format.header === 2 ? false : 2);
        }
        break;
      case '3':
        if (e.shiftKey) {
          e.preventDefault();
          quill.format('header', format.header === 3 ? false : 3);
        }
        break;
      case 'l':
        if (e.shiftKey) {
          e.preventDefault();
          quill.format('list', format.list === 'bullet' ? false : 'bullet');
        }
        break;
      case 'o':
        if (e.shiftKey) {
          e.preventDefault();
          quill.format('list', format.list === 'ordered' ? false : 'ordered');
        }
        break;
    }
  }, []);

  // Attach keyboard shortcuts to the Quill editor specifically
  useEffect(() => {
    let cancelled = false;

    const tryAttach = () => {
      if (cancelled) return;

      const quill = quillRef.current?.getEditor();
      const editorRoot = quill?.root as HTMLElement | undefined;

      if (!editorRoot) {
        requestAnimationFrame(tryAttach);
        return;
      }

      // Ensure we don't leak listeners if Quill recreates the root
      if (shortcutListenerRootRef.current && shortcutListenerRootRef.current !== editorRoot) {
        shortcutListenerRootRef.current.removeEventListener('keydown', handleKeyboardShortcuts as any);
      }

      if (shortcutListenerRootRef.current !== editorRoot) {
        editorRoot.addEventListener('keydown', handleKeyboardShortcuts as any);
        shortcutListenerRootRef.current = editorRoot;
      }
    };

    tryAttach();

    return () => {
      cancelled = true;
      if (shortcutListenerRootRef.current) {
        shortcutListenerRootRef.current.removeEventListener('keydown', handleKeyboardShortcuts as any);
        shortcutListenerRootRef.current = null;
      }
    };
  }, [handleKeyboardShortcuts]);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          [{ font: [] }],
          [{ size: ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ script: 'sub' }, { script: 'super' }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          [{ align: [] }],
          ['blockquote', 'code-block'],
          ['link', 'image', 'video'],
          ['clean'],
          ['takeaway'], // Custom button
        ],
        handlers: {
          takeaway: function () {
            // This will be handled by the parent component
          },
        },
      },
      clipboard: {
        matchVisual: false,
      },
      keyboard: {
        bindings: {
          // Quill has its own bold/italic, we just extend
        },
      },
    }),
    []
  );

  const formats = [
    'header',
    'font',
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'script',
    'list',
    'bullet',
    'indent',
    'align',
    'blockquote',
    'code-block',
    'code', // Inline code
    'link',
    'image',
    'video',
  ];

  // Detect language from code content
  const detectLanguage = (code: string): string => {
    if (code.match(/^(function|const|let|var|import|export)\s/m)) {
      return 'javascript';
    } else if (code.match(/^(def|class|import|from|print)\s/m)) {
      return 'python';
    } else if (code.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)\s/im)) {
      return 'sql';
    } else if (code.match(/^\s*{[\s\S]*}$/m) || code.match(/^\s*\[[\s\S]*]$/m)) {
      return 'json';
    } else if (code.match(/<[a-z][\s\S]*>/i)) {
      return 'markup';
    }
    return 'python';
  };

  // Find and track code blocks - only update positions, not content
  const updateCodeBlockPositions = useCallback(() => {
    if (!containerRef.current) return;

    const preElements = containerRef.current.querySelectorAll<HTMLPreElement>('.ql-editor pre.ql-syntax');
    const containerRect = containerRef.current.getBoundingClientRect();

    const blocks: CodeBlockOverlay[] = [];
    preElements.forEach((pre, idx) => {
      const rect = pre.getBoundingClientRect();
      const code = pre.textContent || '';
      const language = languageOverrides[idx] || detectLanguage(code);

      blocks.push({
        element: pre,
        rect: new DOMRect(rect.left - containerRect.left, rect.top - containerRect.top, rect.width, rect.height),
        code,
        language,
      });
    });

    setCodeBlocks(blocks);
  }, [languageOverrides]);

  // Handler for editor focus - defined after updateCodeBlockPositions
  const handleEditorFocus = useCallback(() => {
    normalizeCodeBlocksIfNeeded();
    updateCodeBlockPositions();
  }, [normalizeCodeBlocksIfNeeded, updateCodeBlockPositions]);

  // Update positions only (not content) on value change
  useEffect(() => {
    const timeout = window.setTimeout(updateCodeBlockPositions, 50);
    return () => window.clearTimeout(timeout);
  }, [value, updateCodeBlockPositions]);

  // One-time normalization in case previous version injected Prism tokens
  useEffect(() => {
    if (hasNormalizedOnce.current) return;
    const timeout = window.setTimeout(() => {
      normalizeCodeBlocksIfNeeded();
      updateCodeBlockPositions();
      hasNormalizedOnce.current = true;
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [normalizeCodeBlocksIfNeeded, updateCodeBlockPositions]);

  // Update positions on scroll/resize
  useEffect(() => {
    const handleUpdate = () => updateCodeBlockPositions();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [updateCodeBlockPositions]);

  // Setup takeaway toolbar button
  useEffect(() => {
    const toolbar = containerRef.current?.querySelector('.ql-toolbar');
    if (!toolbar) return;
    
    // Check if takeaway button already exists
    let takeawayBtn = toolbar.querySelector('.ql-takeaway') as HTMLButtonElement;
    if (!takeawayBtn) {
      // Find the clean button and add takeaway before it or at the end
      const toolbarGroups = toolbar.querySelectorAll('.ql-formats');
      const lastGroup = toolbarGroups[toolbarGroups.length - 1];
      
      if (lastGroup) {
        takeawayBtn = document.createElement('button');
        takeawayBtn.type = 'button';
        takeawayBtn.className = 'ql-takeaway';
        takeawayBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
        takeawayBtn.title = 'Insert Takeaway Block';
        lastGroup.appendChild(takeawayBtn);
      }
    }
    
    const handleTakeawayClick = () => {
      setShowTakeawayDialog(true);
    };
    
    takeawayBtn?.addEventListener('click', handleTakeawayClick);
    return () => {
      takeawayBtn?.removeEventListener('click', handleTakeawayClick);
    };
  }, []);

  const handleCopy = async (index: number) => {
    const code = codeBlocks[index]?.code;
    if (!code) return;
    
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRun = async (index: number) => {
    const block = codeBlocks[index];
    if (!block?.code) return;
    
    setRunningIndex(index);
    setOutputs(prev => ({ ...prev, [index]: { text: "", error: false } }));
    
    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: { code: block.code, language: block.language },
      });

      if (error) {
        setOutputs(prev => ({ ...prev, [index]: { text: error.message || 'Execution failed', error: true } }));
      } else if (data?.error) {
        setOutputs(prev => ({ ...prev, [index]: { text: data.error, error: true } }));
      } else {
        setOutputs(prev => ({ ...prev, [index]: { text: data?.output || 'No output', error: false } }));
      }
    } catch (err: any) {
      setOutputs(prev => ({ ...prev, [index]: { text: err.message || 'Failed to execute', error: true } }));
    } finally {
      setRunningIndex(null);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditedCode(codeBlocks[index]?.code || "");
  };

  const handleSaveEdit = (index: number) => {
    const pre = codeBlocks[index]?.element;
    if (pre) {
      pre.textContent = editedCode;
      const quill = quillRef.current?.getEditor();
      if (quill) {
        quill.update();
      }
      setTimeout(() => {
        const editor = quillRef.current?.getEditor();
        if (editor) {
          onChange(editor.root.innerHTML);
        }
      }, 50);
    }
    setEditingIndex(null);
    // Update code block positions after edit
    setTimeout(updateCodeBlockPositions, 100);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedCode("");
  };

  const closeOutput = (index: number) => {
    setOutputs(prev => {
      const newOutputs = { ...prev };
      delete newOutputs[index];
      return newOutputs;
    });
  };

  // Language change - just update the override, don't mutate DOM with Prism tokens
  const handleLanguageChange = (index: number, language: string) => {
    setLanguageOverrides(prev => ({ ...prev, [index]: language }));
    // Update positions to reflect new language label
    setTimeout(updateCodeBlockPositions, 50);
  };

  const getLanguageLabel = (langValue: string) => {
    return SUPPORTED_LANGUAGES.find(l => l.value === langValue)?.label || langValue;
  };

  // Insert takeaway block
  const handleInsertTakeaway = () => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    
    const items = takeawayItems
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => `<li>${item}</li>`)
      .join('');
    
    const takeawayHtml = `
      <div class="takeaway-block" style="background: linear-gradient(135deg, hsl(48 96% 89%), hsl(45 93% 83%)); border-radius: 12px; padding: 1rem; margin: 1rem 0; border-left: 4px solid hsl(45 93% 47%);">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-weight: 600; color: hsl(45 80% 30%);">
          <span>💡</span>
          <span>${takeawayTitle || 'Key Takeaway'}</span>
        </div>
        <ul style="margin: 0; padding-left: 1.5rem; color: hsl(45 60% 25%);">
          ${items}
        </ul>
      </div>
    `;
    
    const range = quill.getSelection(true);
    quill.clipboard.dangerouslyPasteHTML(range.index, takeawayHtml);
    
    setShowTakeawayDialog(false);
    setTakeawayTitle("");
    setTakeawayItems("");
  };

  // Stable placeholder to prevent re-renders
  const stablePlaceholder = useMemo(() => placeholder || "Write your content here...", [placeholder]);

  return (
    <div className="rich-text-editor" ref={containerRef} onMouseUp={handleTextSelection} onKeyUp={handleTextSelection} onFocus={handleEditorFocus}>
      {/* View mode toggle and keyboard shortcuts */}
      <div className="flex items-center justify-between mb-2 px-1">
        {/* Keyboard shortcuts popover - left side */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground">
              <Keyboard className="w-3 h-3" />
              Shortcuts
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 bg-popover border border-border shadow-lg z-50" align="start">
            <div className="space-y-1">
              <h4 className="font-medium text-sm mb-2">Keyboard Shortcuts</h4>
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <div key={shortcut.action} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{shortcut.action}</span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">{shortcut.keys}</kbd>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        {/* View mode toggle - right side */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewModeChange('edit')}
            className={cn(
              "h-7 px-2 text-xs gap-1",
              viewMode === 'edit' && "bg-primary/10 text-primary"
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
              "h-7 px-2 text-xs gap-1",
              viewMode === 'split' && "bg-primary/10 text-primary"
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
              "h-7 px-2 text-xs gap-1",
              viewMode === 'preview' && "bg-primary/10 text-primary"
            )}
          >
            <Eye className="w-3 h-3" />
            Preview
          </Button>
        </div>
      </div>
      
      {/* Floating toolbar on text selection */}
      {floatingToolbar.visible && (viewMode === 'edit' || viewMode === 'split') && (
        <div 
          className="floating-toolbar absolute z-[100] flex items-center gap-0.5 px-1.5 py-1 bg-popover border border-border rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: `${floatingToolbar.x}px`,
            top: `${floatingToolbar.y}px`,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", floatingToolbar.formats.underline && "bg-primary/20 text-primary")}
            onClick={() => applyFormat('underline')}
          >
            <Underline className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", floatingToolbar.formats.strike && "bg-primary/20 text-primary")}
            onClick={() => applyFormat('strike')}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-5 bg-border mx-0.5" />
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", floatingToolbar.formats.code && "bg-primary/20 text-primary")}
            onClick={() => applyFormat('code')}
          >
            <Code className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", floatingToolbar.formats.background && "bg-primary/20 text-primary")}
            onClick={() => applyFormat('background', floatingToolbar.formats.background ? false : '#ffff00')}
          >
            <Highlighter className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", floatingToolbar.formats.link && "bg-primary/20 text-primary")}
            onClick={() => {
              if (floatingToolbar.formats.link) {
                applyFormat('link', false);
              } else {
                const url = prompt('Enter URL:');
                if (url) applyFormat('link', url);
              }
            }}
          >
            <Link className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
      
      {/* Editor / Preview based on view mode */}
      {viewMode === 'split' ? (
        <div className="relative">
          <ResizablePanelGroup 
            direction="horizontal" 
            className="rounded-lg border border-border"
            style={{ height: `${splitViewHeight}px` }}
          >
            {/* Editor panel */}
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="h-full overflow-auto">
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={value}
                  onChange={handleChange}
                  modules={modules}
                  formats={formats}
                  placeholder={stablePlaceholder}
                  className="bg-background h-full split-view-editor"
                  preserveWhitespace
                />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            {/* Preview panel */}
            <ResizablePanel defaultSize={50} minSize={25}>
              <div 
                className="w-full h-full text-sm leading-relaxed p-4 overflow-auto bg-muted/30 prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: value || '<p class="text-muted-foreground italic">Preview...</p>' }}
              />
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
                const newHeight = Math.max(200, Math.min(800, splitViewDragRef.current.startHeight + deltaY));
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
          className="w-full min-h-[300px] text-sm leading-relaxed border rounded-lg p-4 overflow-auto bg-muted/30 prose prose-sm dark:prose-invert max-w-none"
          style={{ maxHeight: '600px' }}
          dangerouslySetInnerHTML={{ __html: value || '<p class="text-muted-foreground italic">Nothing to preview...</p>' }}
        />
      ) : (
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder={stablePlaceholder}
          className="bg-background"
          preserveWhitespace
        />
      )}
      
      {/* Takeaway Dialog */}
      <Dialog open={showTakeawayDialog} onOpenChange={setShowTakeawayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Insert Takeaway Block
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="takeaway-title">Title (optional)</Label>
              <Input
                id="takeaway-title"
                placeholder="Key Takeaway"
                value={takeawayTitle}
                onChange={(e) => setTakeawayTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="takeaway-items">Items (one per line)</Label>
              <Textarea
                id="takeaway-items"
                placeholder="Enter each takeaway point on a new line..."
                value={takeawayItems}
                onChange={(e) => setTakeawayItems(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTakeawayDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertTakeaway} disabled={!takeawayItems.trim()}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Code block action buttons overlay */}
      {codeBlocks.map((block, index) => (
        <div
          key={index}
          className="absolute pointer-events-none"
          style={{
            left: block.rect.left,
            top: block.rect.top,
            width: block.rect.width,
            height: block.rect.height,
          }}
        >
          {/* Language selector and action buttons */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto z-10">
            {/* Language dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 bg-white/80 hover:bg-white text-gray-600 text-xs font-medium shadow-sm rounded-full"
                >
                  {getLanguageLabel(block.language)}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-white border border-gray-200 shadow-lg z-50">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <DropdownMenuItem
                    key={lang.value}
                    onClick={() => handleLanguageChange(index, lang.value)}
                    className={cn(
                      "cursor-pointer",
                      block.language === lang.value && "bg-gray-100 font-medium"
                    )}
                  >
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Action buttons */}
            <div className="flex items-center gap-1">
            {/* Edit button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editingIndex === index ? handleCancelEdit() : handleEdit(index)}
              className="h-7 w-7 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 shadow-sm"
            >
              {editingIndex === index ? (
                <X className="w-3.5 h-3.5" />
              ) : (
                <Pencil className="w-3.5 h-3.5" />
              )}
            </Button>
            
            {/* Run button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRun(index)}
              disabled={runningIndex === index}
              className="h-7 w-7 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-green-600 shadow-sm"
            >
              {runningIndex === index ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </Button>
            
            {/* Copy button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(index)}
              className="h-7 w-7 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 shadow-sm"
            >
              {copiedIndex === index ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
            </div>
          </div>
          
          {/* Edit overlay */}
          {editingIndex === index && (
            <div className="absolute inset-0 pointer-events-auto bg-white border border-gray-200 rounded-lg overflow-hidden z-20">
              <textarea
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm resize-none outline-none bg-white text-gray-800"
                autoFocus
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveEdit(index)}
                  className="h-7 text-xs"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
          
          {/* Output display */}
          {outputs[index] && (
            <div 
              className={cn(
                "absolute left-0 right-0 pointer-events-auto border rounded-lg mt-1 overflow-hidden",
                outputs[index].error 
                  ? "bg-red-50 border-red-200" 
                  : "bg-gray-50 border-gray-200"
              )}
              style={{ top: block.rect.height }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                <span className={cn(
                  "text-xs font-medium",
                  outputs[index].error ? "text-red-600" : "text-gray-600"
                )}>
                  {outputs[index].error ? "Error" : "Output"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => closeOutput(index)}
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <pre className={cn(
                "px-3 py-2 text-sm font-mono whitespace-pre-wrap",
                outputs[index].error ? "text-red-600" : "text-gray-800"
              )}>
                {outputs[index].text}
              </pre>
            </div>
          )}
        </div>
      ))}
      
      <style>{`
        .rich-text-editor {
          position: relative;
        }
        
        .rich-text-editor .ql-container {
          min-height: 300px;
          font-family: inherit;
          border-bottom-left-radius: var(--radius);
          border-bottom-right-radius: var(--radius);
        }
        
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: var(--radius);
          border-top-right-radius: var(--radius);
          background: hsl(var(--muted));
          border-color: hsl(var(--border));
          flex-wrap: wrap;
        }
        
        .rich-text-editor .ql-container {
          border-color: hsl(var(--border));
          background: hsl(var(--background));
        }
        
        .rich-text-editor .ql-editor {
          color: hsl(var(--foreground));
          font-size: 14px;
          line-height: 1.6;
        }
        
        .rich-text-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        
        .rich-text-editor .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        
        .rich-text-editor .ql-fill {
          fill: hsl(var(--foreground));
        }
        
        .rich-text-editor .ql-picker-label {
          color: hsl(var(--foreground));
        }
        
        .rich-text-editor .ql-picker-options {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
        }
        
        .rich-text-editor .ql-toolbar button:hover,
        .rich-text-editor .ql-toolbar button:focus,
        .rich-text-editor .ql-toolbar button.ql-active,
        .rich-text-editor .ql-toolbar .ql-picker-label:hover,
        .rich-text-editor .ql-toolbar .ql-picker-label.ql-active,
        .rich-text-editor .ql-toolbar .ql-picker-item:hover,
        .rich-text-editor .ql-toolbar .ql-picker-item.ql-selected {
          color: hsl(var(--primary));
        }
        
        .rich-text-editor .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor .ql-toolbar button:focus .ql-stroke,
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke,
        .rich-text-editor .ql-toolbar .ql-picker-label:hover .ql-stroke,
        .rich-text-editor .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
        .rich-text-editor .ql-toolbar .ql-picker-item:hover .ql-stroke,
        .rich-text-editor .ql-toolbar .ql-picker-item.ql-selected .ql-stroke {
          stroke: hsl(var(--primary));
        }
        
        .rich-text-editor .ql-toolbar button:hover .ql-fill,
        .rich-text-editor .ql-toolbar button:focus .ql-fill,
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill,
        .rich-text-editor .ql-toolbar .ql-picker-label:hover .ql-fill,
        .rich-text-editor .ql-toolbar .ql-picker-label.ql-active .ql-fill,
        .rich-text-editor .ql-toolbar .ql-picker-item:hover .ql-fill,
        .rich-text-editor .ql-toolbar .ql-picker-item.ql-selected .ql-fill {
          fill: hsl(var(--primary));
        }
        
        /* Takeaway button styling */
        .rich-text-editor .ql-toolbar .ql-takeaway {
          width: 28px;
          height: 24px;
          padding: 3px 5px;
        }
        
        .rich-text-editor .ql-toolbar .ql-takeaway:hover {
          color: hsl(45 93% 47%);
        }
        
        .rich-text-editor .ql-toolbar .ql-takeaway svg {
          stroke: currentColor;
        }
        
        /* Code block styling */
        .rich-text-editor .ql-editor pre.ql-syntax {
          background-color: hsl(143 20% 95%);
          color: hsl(143 30% 25%);
          border: 1px solid hsl(143 20% 88%);
          border-radius: 12px;
          padding: 1rem;
          padding-top: 2.5rem;
          margin: 1rem 0;
          overflow-x: auto;
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          line-height: 1.5;
          position: relative;
        }
        
        /* Prism syntax highlighting colors for green theme */
        .rich-text-editor .ql-editor pre.ql-syntax .token.comment,
        .rich-text-editor .ql-editor pre.ql-syntax .token.prolog,
        .rich-text-editor .ql-editor pre.ql-syntax .token.doctype,
        .rich-text-editor .ql-editor pre.ql-syntax .token.cdata {
          color: hsl(143 15% 50%);
          font-style: italic;
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.punctuation {
          color: hsl(143 20% 40%);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.property,
        .rich-text-editor .ql-editor pre.ql-syntax .token.tag,
        .rich-text-editor .ql-editor pre.ql-syntax .token.boolean,
        .rich-text-editor .ql-editor pre.ql-syntax .token.number,
        .rich-text-editor .ql-editor pre.ql-syntax .token.constant,
        .rich-text-editor .ql-editor pre.ql-syntax .token.symbol,
        .rich-text-editor .ql-editor pre.ql-syntax .token.deleted {
          color: hsl(340 70% 45%);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.selector,
        .rich-text-editor .ql-editor pre.ql-syntax .token.attr-name,
        .rich-text-editor .ql-editor pre.ql-syntax .token.string,
        .rich-text-editor .ql-editor pre.ql-syntax .token.char,
        .rich-text-editor .ql-editor pre.ql-syntax .token.builtin,
        .rich-text-editor .ql-editor pre.ql-syntax .token.inserted {
          color: hsl(143 50% 35%);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.operator,
        .rich-text-editor .ql-editor pre.ql-syntax .token.entity,
        .rich-text-editor .ql-editor pre.ql-syntax .token.url,
        .rich-text-editor .ql-editor pre.ql-syntax .token.variable {
          color: hsl(143 30% 30%);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.atrule,
        .rich-text-editor .ql-editor pre.ql-syntax .token.attr-value,
        .rich-text-editor .ql-editor pre.ql-syntax .token.keyword {
          color: hsl(200 70% 40%);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.function,
        .rich-text-editor .ql-editor pre.ql-syntax .token.class-name {
          color: hsl(280 60% 45%);
        }
        
        .rich-text-editor .ql-editor pre.ql-syntax .token.regex,
        .rich-text-editor .ql-editor pre.ql-syntax .token.important {
          color: hsl(30 80% 45%);
        }
        
        /* Inline code styling */
        .rich-text-editor .ql-editor code {
          background-color: hsl(var(--muted));
          color: hsl(var(--foreground));
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.9em;
        }
        
        /* Takeaway block styling */
        .rich-text-editor .ql-editor .takeaway-block {
          background: linear-gradient(135deg, hsl(48 96% 89%), hsl(45 93% 83%));
          border-radius: 12px;
          padding: 1rem;
          margin: 1rem 0;
          border-left: 4px solid hsl(45 93% 47%);
        }
        
        /* Split view editor styling */
        .rich-text-editor .split-view-editor .ql-toolbar {
          border-radius: 0;
          border: none;
          border-bottom: 1px solid hsl(var(--border));
        }
        
        .rich-text-editor .split-view-editor .ql-container {
          border: none;
          min-height: auto;
        }
        
        .rich-text-editor .split-view-editor .ql-editor {
          min-height: 200px;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
