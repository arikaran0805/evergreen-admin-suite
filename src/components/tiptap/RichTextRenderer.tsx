/**
 * TipTap Rich Text Renderer
 * 
 * Safe content renderer that converts TipTap JSON to HTML.
 * Does NOT use dangerouslySetInnerHTML with user-provided HTML.
 * Content is rendered through TipTap's generateHTML which is XSS-safe.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { parseContent, tipTapJSONToHTML, isContentEmpty } from '@/lib/tiptapMigration';
import type { JSONContent } from '@tiptap/react';

interface RichTextRendererProps {
  /**
   * Content to render - accepts HTML string, TipTap JSON, or stringified JSON
   * Legacy HTML content will be automatically migrated to JSON before rendering
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
 * This component renders TipTap JSON content as HTML.
 * 
 * Security:
 * - Content is parsed through TipTap's JSON parser
 * - Only whitelisted tags/attributes are rendered
 * - No raw HTML injection possible
 * 
 * Legacy Support:
 * - Automatically converts legacy HTML to TipTap JSON
 * - Handles Quill-specific formatting
 */
export const RichTextRenderer = ({
  content,
  className,
  emptyPlaceholder = 'No content',
}: RichTextRendererProps) => {
  // Parse and convert content to safe HTML
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
    <div className={cn('rich-text-content', className)}>
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      
      {/* Renderer styles */}
      <style>{`
        .rich-text-content .prose h1 {
          font-size: 2em;
          font-weight: 700;
          line-height: 1.2;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }

        .rich-text-content .prose h2 {
          font-size: 1.5em;
          font-weight: 600;
          line-height: 1.3;
          margin-top: 1.25em;
          margin-bottom: 0.5em;
        }

        .rich-text-content .prose h3 {
          font-size: 1.25em;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }

        .rich-text-content .prose p {
          margin: 0.75em 0;
        }

        .rich-text-content .prose ul,
        .rich-text-content .prose ol {
          padding-left: 1.5em;
          margin: 0.75em 0;
        }

        .rich-text-content .prose ul {
          list-style-type: disc;
        }

        .rich-text-content .prose ol {
          list-style-type: decimal;
        }

        .rich-text-content .prose li {
          margin: 0.25em 0;
        }

        .rich-text-content .prose blockquote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }

        .rich-text-content .prose pre {
          background: hsl(143 20% 95%);
          color: hsl(143 30% 25%);
          border: 1px solid hsl(143 20% 88%);
          border-radius: 0.75rem;
          padding: 1rem;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          overflow-x: auto;
          margin: 1em 0;
        }

        .rich-text-content .prose pre code {
          background: none;
          color: inherit;
          padding: 0;
          font-size: inherit;
        }

        .rich-text-content .prose code {
          background: hsl(var(--muted));
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-size: 0.9em;
        }

        .rich-text-content .prose a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }

        .rich-text-content .prose a:hover {
          opacity: 0.8;
        }

        .rich-text-content .prose hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1.5em 0;
        }

        .rich-text-content .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }

        .dark .rich-text-content .prose pre {
          background: hsl(143 20% 12%);
          color: hsl(143 30% 80%);
          border-color: hsl(143 20% 20%);
        }
      `}</style>
    </div>
  );
};

export default RichTextRenderer;
