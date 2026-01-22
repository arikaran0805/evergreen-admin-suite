/**
 * TipTap RichTextEditor
 * 
 * Secure rich text editor using TipTap (ProseMirror-based).
 * - JSON output format (no raw HTML storage)
 * - XSS-safe by design
 * - Uses shared tiptap.css - NO inline styles
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
import '@/styles/tiptap.css';

type ViewMode = 'edit' | 'preview' | 'split';

export interface RichTextEditorProps {
  value: string | JSONContent;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  showCodeBlock?: boolean;
  characterLimit?: number;
  className?: string;
  annotationMode?: boolean;
  annotations?: Array<{
    id: string;
    selection_start: number;
    selection_end: number;
    selected_text: string;
    status: string;
  }>;
  onAnnotationClick?: (annotation: any) => void;
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
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('tiptapEditorViewMode');
    return (saved === 'edit' || saved === 'preview' || saved === 'split') ? saved : 'edit';
  });

  const initialContent = parseContent(value);

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
        emptyEditorClass: 'tiptap-empty',
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
      if (annotationMode && onTextSelect) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const text = editor.state.doc.textBetween(from, to, ' ');
          if (text.trim().length >= 2) {
            const coords = editor.view.coordsAtPos(from);
            const endCoords = editor.view.coordsAtPos(to);
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

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly && !annotationMode);
    }
  }, [editor, readOnly, annotationMode]);

  useEffect(() => {
    if (!editor) return;
    
    const newContent = parseContent(value);
    const currentContent = editor.getJSON();
    
    if (JSON.stringify(newContent) !== JSON.stringify(currentContent)) {
      editor.commands.setContent(newContent);
    }
  }, [value, editor]);

  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    getJSON: () => editor?.getJSON(),
    getHTML: () => editor ? tipTapJSONToHTML(editor.getJSON()) : '',
    getText: () => editor?.getText() || '',
    isEmpty: () => editor?.isEmpty ?? true,
    focus: () => editor?.commands.focus(),
  }));

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('tiptapEditorViewMode', mode);
  }, []);

  const previewHTML = editor ? tipTapJSONToHTML(editor.getJSON()) : '';

  if (!editor) {
    return (
      <div className={cn('border rounded-lg bg-background min-h-[300px] animate-pulse', className)} />
    );
  }

  return (
    <div className={cn('tiptap-editor-wrapper border rounded-lg overflow-hidden', className)}>
      {/* View mode toggle */}
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

      {/* Toolbar */}
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
              className="h-full overflow-auto p-4 tiptap-content bg-muted/30"
              dangerouslySetInnerHTML={{ __html: previewHTML || '<p class="text-muted-foreground italic">Preview...</p>' }}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : viewMode === 'preview' ? (
        <div
          className="min-h-[300px] p-4 tiptap-content bg-muted/30"
          dangerouslySetInnerHTML={{ __html: previewHTML || '<p class="text-muted-foreground italic">Nothing to preview...</p>' }}
        />
      ) : (
        <EditorContent
          editor={editor}
          className="tiptap-editor min-h-[300px]"
        />
      )}

      {/* Character count */}
      {characterLimit && editor && (
        <div className="flex justify-end px-3 py-1 border-t border-border text-xs text-muted-foreground">
          {editor.storage.characterCount.characters()} / {characterLimit} characters
        </div>
      )}
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
