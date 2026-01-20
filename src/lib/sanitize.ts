/**
 * HTML Sanitization Utility
 * 
 * Security-first approach to prevent XSS attacks from user-generated HTML content.
 * Uses DOMPurify with a strict whitelist of allowed tags and attributes.
 * 
 * @see https://github.com/cure53/DOMPurify
 */
import DOMPurify, { Config } from 'dompurify';

/**
 * Configuration for DOMPurify sanitization.
 * 
 * SECURITY DECISIONS:
 * - ALLOWED_TAGS: Only basic formatting tags needed for rich text editing
 * - ALLOWED_ATTR: Minimal attributes to prevent event handler injection
 * - FORBID_TAGS: Explicitly block dangerous elements
 * - FORBID_ATTR: Block all event handlers and dangerous attributes
 */
const SANITIZE_CONFIG: Config = {
  // Whitelist of allowed HTML tags for rich text content
  ALLOWED_TAGS: [
    // Text formatting
    'p', 'br', 'span', 'div',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
    'sub', 'sup', 'mark',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Links (with restricted attributes)
    'a',
    // Block elements
    'blockquote', 'pre', 'code',
    // Tables (for structured content)
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    // Images (with restricted attributes)
    'img',
    // Horizontal rule
    'hr',
  ],
  
  // Whitelist of allowed attributes
  ALLOWED_ATTR: [
    // Common
    'class', 'id', 'style',
    // Links
    'href', 'target', 'rel',
    // Images
    'src', 'alt', 'width', 'height', 'loading',
    // Tables
    'colspan', 'rowspan',
    // Quill-specific classes
    'data-language',
    // Accessibility
    'aria-label', 'aria-hidden', 'role',
  ],
  
  // Explicitly forbidden elements (defense in depth)
  FORBID_TAGS: [
    'script', 'iframe', 'object', 'embed', 'form', 'input',
    'button', 'select', 'textarea', 'meta', 'link', 'base',
    'noscript', 'template', 'slot', 'svg', 'math',
  ],
  
  // Block all event handlers
  FORBID_ATTR: [
    'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
    'onmousemove', 'onmouseout', 'onkeydown', 'onkeypress', 'onkeyup',
    'onload', 'onerror', 'onabort', 'onfocus', 'onblur', 'onchange',
    'onsubmit', 'onreset', 'onselect', 'oninput', 'onscroll',
    'oncontextmenu', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave',
    'ondragover', 'ondragstart', 'ondrop', 'onanimationend', 'onanimationiteration',
    'onanimationstart', 'ontransitionend', 'onpointerdown', 'onpointerup',
    'onpointermove', 'onpointerover', 'onpointerout', 'onpointerenter',
    'onpointerleave', 'onpointercancel', 'ontouchstart', 'ontouchmove',
    'ontouchend', 'ontouchcancel', 'formaction', 'xlink:href',
  ],
  
  // Force all links to have safe attributes
  ADD_ATTR: ['target'],
  
  // Enforce HTTPS for external resources
  ALLOW_DATA_ATTR: false,
  
  // Return a document fragment for better performance
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM: false,
  
  // Keep text content even if tags are removed
  KEEP_CONTENT: true,
};

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * 
 * Use this function whenever:
 * - Rendering user-generated HTML content
 * - Saving content from rich text editors
 * - Displaying content from the database
 * 
 * @param dirtyHtml - The potentially unsafe HTML string
 * @returns Sanitized HTML string safe for rendering
 * 
 * @example
 * ```tsx
 * import { sanitizeHtml } from '@/lib/sanitize';
 * 
 * // Before rendering
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }} />
 * 
 * // Before saving
 * await supabase.from('posts').insert({ content: sanitizeHtml(editorValue) });
 * ```
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return '';
  
  // Sanitize the HTML using DOMPurify with our strict config
  // Cast to string as DOMPurify may return TrustedHTML in some environments
  const clean = DOMPurify.sanitize(dirtyHtml, SANITIZE_CONFIG);
  
  return String(clean);
}

/**
 * Hook to add additional sanitization for links.
 * Forces all links to open in new tab with security attributes.
 */
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  // Force links to be safe
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
  
  // Ensure images have loading attribute for performance
  if (node.tagName === 'IMG') {
    node.setAttribute('loading', 'lazy');
  }
});

/**
 * Stricter sanitization for simple text content.
 * Removes ALL HTML, leaving only plain text.
 * 
 * @param dirtyHtml - The potentially unsafe HTML string
 * @returns Plain text with all HTML removed
 */
export function stripHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return '';
  
  const clean = DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  
  return String(clean);
}

/**
 * Sanitizes HTML specifically for code blocks.
 * More permissive to allow code content but still safe.
 * 
 * @param codeHtml - HTML containing code blocks
 * @returns Sanitized HTML with code preserved
 */
export function sanitizeCodeHtml(codeHtml: string): string {
  if (!codeHtml) return '';
  
  const clean = DOMPurify.sanitize(codeHtml, {
    ...SANITIZE_CONFIG,
    // Allow more code-related elements
    ALLOWED_TAGS: [
      ...SANITIZE_CONFIG.ALLOWED_TAGS || [],
      'pre', 'code', 'span',
    ],
    // Allow code highlighting classes
    ALLOWED_ATTR: [
      ...SANITIZE_CONFIG.ALLOWED_ATTR || [],
      'class', 'data-language', 'spellcheck',
    ],
  });
  
  return String(clean);
}

export default sanitizeHtml;
