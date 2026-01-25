/**
 * TipTap Migration Utilities
 * 
 * Handles conversion between legacy HTML (from react-quill) and TipTap JSON format.
 * Provides safe parsing and sanitization during migration.
 * 
 * NOTE: For RENDERING, use RichTextRenderer which uses real TipTap editor
 * with full schema including ExecutableCodeBlock and AnnotationMark.
 * 
 * This file is for HTML/JSON conversion only during content migration.
 */

import { generateHTML, generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import type { JSONContent } from '@tiptap/react';

// Extensions used for parsing/generating HTML during migration
// NOTE: This is a minimal set for HTML parsing - does NOT include custom nodes
// Use RichTextRenderer for full rendering with ExecutableCodeBlock & AnnotationMark
const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },
    // Use default codeBlock for HTML parsing (migration only)
    codeBlock: { HTMLAttributes: { class: 'code-block' } },
  }),
  Link.configure({ openOnClick: false }),
  Underline,
  Highlight.configure({ multicolor: true }),
];

/**
 * Detect if content is already TipTap JSON format
 */
export const isTipTapJSON = (content: string | JSONContent | null | undefined): boolean => {
  if (!content) return false;
  
  // If it's already an object, check for TipTap structure
  if (typeof content === 'object') {
    return 'type' in content && content.type === 'doc';
  }
  
  // Try parsing as JSON
  try {
    const parsed = JSON.parse(content);
    return typeof parsed === 'object' && parsed !== null && parsed.type === 'doc';
  } catch {
    return false;
  }
};

/**
 * Parse content - handles both HTML and JSON formats
 */
export const parseContent = (content: string | JSONContent | null | undefined): JSONContent => {
  // Empty content
  if (!content) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }

  // Already a JSON object
  if (typeof content === 'object') {
    if ('type' in content && content.type === 'doc') {
      return content;
    }
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }

  // Try parsing as JSON first
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      return parsed;
    }
  } catch {
    // Not JSON, treat as HTML
  }

  // Parse HTML to TipTap JSON
  return htmlToTipTapJSON(content);
};

/**
 * Convert legacy HTML to TipTap JSON format
 * Handles Quill-specific classes and sanitizes content
 */
export const htmlToTipTapJSON = (html: string): JSONContent => {
  if (!html || !html.trim()) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }

  // Pre-process Quill-specific HTML
  let processedHtml = html
    // Convert Quill code blocks to standard pre/code
    .replace(/<pre class="ql-syntax[^"]*"[^>]*>([\s\S]*?)<\/pre>/gi, '<pre><code>$1</code></pre>')
    // Remove Quill-specific classes
    .replace(/class="ql-[^"]*"/gi, '')
    // Convert Quill list attributes
    .replace(/data-list="[^"]*"/gi, '')
    // Convert Quill indent attributes
    .replace(/class="ql-indent-\d+"/gi, '')
    // Remove empty spans
    .replace(/<span[^>]*>\s*<\/span>/gi, '')
    // Normalize br tags
    .replace(/<br\s*\/?>/gi, '<br>');

  // Clean up empty paragraphs
  processedHtml = processedHtml.replace(/<p>\s*<\/p>/gi, '<p><br></p>');

  try {
    const json = generateJSON(processedHtml, extensions);
    return json;
  } catch (error) {
    console.error('Failed to parse HTML to TipTap JSON:', error);
    // Return basic doc with the content as a paragraph
    return {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: html.replace(/<[^>]*>/g, '') }]
      }]
    };
  }
};

/**
 * Convert TipTap JSON to sanitized HTML for rendering
 */
export const tipTapJSONToHTML = (json: JSONContent): string => {
  if (!json || !json.content || json.content.length === 0) {
    return '';
  }

  try {
    return generateHTML(json, extensions);
  } catch (error) {
    console.error('Failed to generate HTML from TipTap JSON:', error);
    return '';
  }
};

/**
 * Serialize TipTap JSON content to string for storage
 */
export const serializeContent = (content: JSONContent): string => {
  return JSON.stringify(content);
};

/**
 * Check if content is empty (no meaningful text)
 */
export const isContentEmpty = (content: JSONContent | null | undefined): boolean => {
  if (!content || !content.content) return true;
  
  const hasText = (node: JSONContent): boolean => {
    if (node.text && node.text.trim()) return true;
    if (node.content) {
      return node.content.some(hasText);
    }
    return false;
  };

  return !hasText(content);
};

/**
 * Extract plain text from TipTap JSON
 */
export const extractPlainText = (content: JSONContent): string => {
  const getText = (node: JSONContent): string => {
    if (node.text) return node.text;
    if (node.content) {
      return node.content.map(getText).join(' ');
    }
    return '';
  };

  return getText(content).replace(/\s+/g, ' ').trim();
};

/**
 * Get a safe text preview from any content format (HTML, TipTap JSON, or plain text)
 * Useful for displaying excerpts/previews without raw JSON
 */
export const getTextPreview = (content: string | null | undefined, maxLength: number = 150): string => {
  if (!content || !content.trim()) {
    return '';
  }

  // Check if it's TipTap JSON
  if (isTipTapJSON(content)) {
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      const plainText = extractPlainText(parsed);
      if (plainText.length > maxLength) {
        return plainText.substring(0, maxLength).trim() + '...';
      }
      return plainText;
    } catch {
      return '';
    }
  }

  // Strip HTML tags and get plain text
  const plainText = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length > maxLength) {
    return plainText.substring(0, maxLength).trim() + '...';
  }
  return plainText;
};

/**
 * Migration helper for batch processing
 * Returns statistics about the migration
 */
export const migrateContentBatch = (contents: string[]): {
  migrated: JSONContent[];
  stats: {
    total: number;
    alreadyJSON: number;
    convertedFromHTML: number;
    empty: number;
    errors: number;
  };
} => {
  const stats = {
    total: contents.length,
    alreadyJSON: 0,
    convertedFromHTML: 0,
    empty: 0,
    errors: 0,
  };

  const migrated = contents.map(content => {
    if (!content || !content.trim()) {
      stats.empty++;
      return { type: 'doc', content: [{ type: 'paragraph' }] } as JSONContent;
    }

    if (isTipTapJSON(content)) {
      stats.alreadyJSON++;
      return parseContent(content);
    }

    try {
      const json = htmlToTipTapJSON(content);
      stats.convertedFromHTML++;
      return json;
    } catch {
      stats.errors++;
      return { type: 'doc', content: [{ type: 'paragraph' }] } as JSONContent;
    }
  });

  return { migrated, stats };
};
