/**
 * TipTap Rich Text Renderer
 *
 * Renders TipTap JSON content using a real TipTap editor instance
 * with editable: false for proper custom node/mark rendering.
 *
 * ✅ Uses getRenderExtensions() for schema parity
 * ✅ Supports ExecutableCodeBlock
 * ✅ Supports AnnotationMark
 * ❌ No dangerouslySetInnerHTML
 */

import { useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { getRenderExtensions } from './editorConfig';
import { parseContent, isContentEmpty } from '@/lib/tiptapMigration';
import '@/styles/tiptap.css';

interface RichTextRendererProps {
  /**
   * Content to render - accepts HTML string, TipTap JSON, or stringified JSON
   */
  content: string | JSONContent | null | undefined;
  /**
   * Custom class name
   */
  className?: string;
  /**
   * Placeholder text when content is empty
   */
  emptyPlaceholder?: string;
}

/**
 * Rich Text Renderer using TipTap
 *
 * Uses a real TipTap editor instance with editable: false
 * to properly render custom nodes (ExecutableCodeBlock) and marks (AnnotationMark)
 */
export const RichTextRenderer = ({
  content,
  className,
  emptyPlaceholder = 'No content',
}: RichTextRendererProps) => {
  // Parse content to TipTap JSON format
  const parsedContent = useMemo(() => {
    if (!content) return null;
    const json = parseContent(content);
    if (isContentEmpty(json)) return null;
    return json;
  }, [content]);

  // Create read-only editor with full schema
  const editor = useEditor(
    {
      extensions: getRenderExtensions(),
      content: parsedContent,
      editable: false,
      editorProps: {
        attributes: {
          class: 'tiptap-renderer prose prose-sm dark:prose-invert max-w-none focus:outline-none',
        },
      },
    },
    [parsedContent]
  );

  // Show placeholder when no content
  if (!parsedContent) {
    return (
      <div className={cn('text-muted-foreground italic', className)}>
        {emptyPlaceholder}
      </div>
    );
  }

  return (
    <div className={cn('tiptap-content', className)}>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextRenderer;
