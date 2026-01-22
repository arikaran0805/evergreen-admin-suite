/**
 * TipTap Rich Text Renderer
 * 
 * Safe content renderer that converts TipTap JSON to HTML.
 * Uses shared tiptap.css for styling - NO inline styles.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { parseContent, tipTapJSONToHTML, isContentEmpty } from '@/lib/tiptapMigration';
import type { JSONContent } from '@tiptap/react';
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
 * Safe Rich Text Renderer
 * 
 * Security:
 * - Content is parsed through TipTap's JSON parser
 * - Only whitelisted tags/attributes are rendered
 * - No raw HTML injection possible
 */
export const RichTextRenderer = ({
  content,
  className,
  emptyPlaceholder = 'No content',
}: RichTextRendererProps) => {
  const html = useMemo(() => {
    if (!content) return '';
    
    const json = parseContent(content);
    if (isContentEmpty(json)) return '';
    
    return tipTapJSONToHTML(json);
  }, [content]);

  if (!html) {
    return (
      <div className={cn('text-muted-foreground italic', className)}>
        {emptyPlaceholder}
      </div>
    );
  }

  return (
    <div className={cn('tiptap-content', className)}>
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

export default RichTextRenderer;
