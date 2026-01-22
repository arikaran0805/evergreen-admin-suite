/**
 * TipTap RichTextEditor
 * 
 * Secure rich text editor using TipTap (ProseMirror-based).
 * - JSON output format (no raw HTML storage)
 * - XSS-safe by design
 * - Maintains feature parity with legacy react-quill editor
 */

import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent, type JSONContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { cn } from '@/lib/utils';
import { EditorToolbar } from './EditorToolbar';
import { parseContent, serializeContent, tipTapJSONToHTML } from '@/lib/tiptapMigration';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Columns } from 'lucide-react';

// View modes
type ViewMode = 'edit' | 'preview' | 'split';

export interface RichTextEditorProps {
  /**
   * Initial content - accepts HTML string, TipTap JSON, or stringified JSON
   * Legacy HTML content will be automatically migrated to JSON
   */
  value: string | JSONContent;
  /**
   * Callback when content changes - returns stringified JSON
   */
  onChange: (value: string) => void;
  /**
   * Placeholder text when editor is empty
   */
  placeholder?: string;
  /**
   * Enable read-only mode
   */
  readOnly?: boolean;
  /**
   * Show code block button in toolbar (admin-only feature)
   */
  showCodeBlock?: boolean;
  /**
   * Character limit (optional)
   */
  characterLimit?: number;
  /**
   * Custom class name
   */
  className?: string;
  /**
   * Annotation mode - when true, disables editing and enables text selection for annotations
   */
  annotationMode?: boolean;
  /**
   * Annotations to display (from legacy system)
   */
  annotations?: Array<{
    id: string;
    selection_start: number;
    selection_end: number;
    selected_text: string;
    status: string;
  }>;
  /**
   * Callback when an annotation is clicked
   */
  onAnnotationClick?: (annotation: any) => void;
  /**
   * Callback when text is selected (for creating annotations)
   */
  onTextSelect?: (selection: {
    start: number;
    end: number;
    text: string;
    type: 'paragraph' | 'code';
    rect?: { top: number; left: number; width: number; height: number; bottom: number };
  }) => void;
}

export interface RichTextEditorRef {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | undefined;
  getHTML: () => string;
  getText: () => string;
  isEmpty: () => boolean;
  focus: () => void;
}

/**
 * TipTap-based Rich Text Editor
 * 
 * Features:
 * - JSON-first content model (no raw HTML storage)
 * - Automatic migration from legacy HTML content
 * - Safe toolbar with curated formatting options
 * - Split view with live preview
 * - Keyboard shortcuts
 * - Read-only mode support
 * - Annotation mode support
 */
export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = 'Write your content here...',
  readOnly = false,
  showCodeBlock = true,
  characterLimit,
  className,
  annotationMode = false,
  annotations = [],
  onAnnotationClick,
  onTextSelect,
}, ref) => {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('tiptapEditorViewMode');
    return (saved === 'edit' || saved === 'preview' || saved === 'split') ? saved : 'edit';
  });

  // Parse initial content (handles legacy HTML migration)
  const initialContent = parseContent(value);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: {
          HTMLAttributes: { class: 'code-block' },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      ...(characterLimit ? [CharacterCount.configure({ limit: characterLimit })] : []),
    ],
    content: initialContent,
    editable: !readOnly && !annotationMode,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange(serializeContent(json));
    },
    onSelectionUpdate: ({ editor }) => {
      // Handle text selection for annotations
      if (annotationMode && onTextSelect) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const text = editor.state.doc.textBetween(from, to, ' ');
          if (text.trim().length >= 2) {
            // Get selection coordinates for popup positioning
            const coords = editor.view.coordsAtPos(from);
            const endCoords = editor.view.coordsAtPos(to);
            
            // Check if selection is in a code block
            const isCodeBlock = editor.isActive('codeBlock');
            
            onTextSelect({
              start: from,
              end: to,
              text: text.trim(),
              type: isCodeBlock ? 'code' : 'paragraph',
              rect: {
                top: coords.top,
                left: coords.left,
                width: endCoords.left - coords.left,
                height: coords.bottom - coords.top,
                bottom: coords.bottom,
              },
            });
          }
        }
      }
    },
  });

  // Update editability when props change
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly && !annotationMode);
    }
  }, [editor, readOnly, annotationMode]);

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;
    
    const newContent = parseContent(value);
    const currentContent = editor.getJSON();
    
    // Only update if content is different (prevent infinite loops)
    if (JSON.stringify(newContent) !== JSON.stringify(currentContent)) {
      editor.commands.setContent(newContent);
    }
  }, [value, editor]);

  // Expose editor methods via ref
  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    getJSON: () => editor?.getJSON(),
    getHTML: () => editor ? tipTapJSONToHTML(editor.getJSON()) : '',
    getText: () => editor?.getText() || '',
    isEmpty: () => editor?.isEmpty ?? true,
    focus: () => editor?.commands.focus(),
  }));

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('tiptapEditorViewMode', mode);
  }, []);

  // Generate preview HTML
  const previewHTML = editor ? tipTapJSONToHTML(editor.getJSON()) : '';

  if (!editor) {
    return (
      <div className={cn('border rounded-lg bg-background min-h-[300px] animate-pulse', className)} />
    );
  }

  return (
    <div className={cn('rich-text-editor border rounded-lg overflow-hidden', className)}>
      {/* View mode toggle (hide in annotation mode or read-only) */}
      {!annotationMode && !readOnly && (
        <div className="flex items-center justify-end p-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange('edit')}
              className={cn(
                'h-7 px-2 text-xs gap-1',
                viewMode === 'edit' && 'bg-primary/10 text-primary'
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
                'h-7 px-2 text-xs gap-1',
                viewMode === 'split' && 'bg-primary/10 text-primary'
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
                'h-7 px-2 text-xs gap-1',
                viewMode === 'preview' && 'bg-primary/10 text-primary'
              )}
            >
              <Eye className="w-3 h-3" />
              Preview
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar (hide in preview mode, read-only, or annotation mode) */}
      {viewMode !== 'preview' && !readOnly && !annotationMode && (
        <EditorToolbar editor={editor} showCodeBlock={showCodeBlock} />
      )}

      {/* Editor content based on view mode */}
      {viewMode === 'split' ? (
        <ResizablePanelGroup direction="horizontal" className="min-h-[300px]">
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="h-full overflow-auto">
              <EditorContent
                editor={editor}
                className="tiptap-editor h-full"
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={25}>
            <div
              className="h-full overflow-auto p-4 prose prose-sm dark:prose-invert max-w-none bg-muted/30"
              dangerouslySetInnerHTML={{ __html: previewHTML || '<p class="text-muted-foreground italic">Preview...</p>' }}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : viewMode === 'preview' ? (
        <div
          className="min-h-[300px] p-4 prose prose-sm dark:prose-invert max-w-none bg-muted/30"
          dangerouslySetInnerHTML={{ __html: previewHTML || '<p class="text-muted-foreground italic">Nothing to preview...</p>' }}
        />
      ) : (
        <EditorContent
          editor={editor}
          className="tiptap-editor min-h-[300px]"
        />
      )}

      {/* Character count (if limit is set) */}
      {characterLimit && editor && (
        <div className="flex justify-end px-3 py-1 border-t border-border text-xs text-muted-foreground">
          {editor.storage.characterCount.characters()} / {characterLimit} characters
        </div>
      )}

      {/* Editor styles */}
      <style>{`
        .tiptap-editor .ProseMirror {
          min-height: 250px;
          padding: 1rem;
          outline: none;
        }

        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: hsl(var(--muted-foreground));
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .tiptap-editor .ProseMirror > * + * {
          margin-top: 0.75em;
        }

        .tiptap-editor .ProseMirror h1 {
          font-size: 2em;
          font-weight: 700;
          line-height: 1.2;
        }

        .tiptap-editor .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: 600;
          line-height: 1.3;
        }

        .tiptap-editor .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: 600;
          line-height: 1.4;
        }

        .tiptap-editor .ProseMirror ul,
        .tiptap-editor .ProseMirror ol {
          padding-left: 1.5em;
        }

        .tiptap-editor .ProseMirror ul {
          list-style-type: disc;
        }

        .tiptap-editor .ProseMirror ol {
          list-style-type: decimal;
        }

        .tiptap-editor .ProseMirror blockquote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 1em;
          margin-left: 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }

        .tiptap-editor .ProseMirror pre {
          background: hsl(143 20% 95%);
          color: hsl(143 30% 25%);
          border: 1px solid hsl(143 20% 88%);
          border-radius: 0.75rem;
          padding: 1rem;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          overflow-x: auto;
        }

        .tiptap-editor .ProseMirror pre code {
          background: none;
          color: inherit;
          padding: 0;
          font-size: inherit;
        }

        .tiptap-editor .ProseMirror code {
          background: hsl(var(--muted));
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-size: 0.9em;
        }

        .tiptap-editor .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
          cursor: pointer;
        }

        .tiptap-editor .ProseMirror a:hover {
          opacity: 0.8;
        }

        .tiptap-editor .ProseMirror hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1.5em 0;
        }

        .tiptap-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
        }

        .tiptap-editor .ProseMirror p {
          margin: 0;
        }

        .dark .tiptap-editor .ProseMirror pre {
          background: hsl(143 20% 12%);
          color: hsl(143 30% 80%);
          border-color: hsl(143 20% 20%);
        }
      `}</style>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
