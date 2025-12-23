// Shared helpers for chat-style content stored as either plain text or rich-editor HTML.

const RICH_HTML_TAG_RE = /<\/?(p|div|br|span|strong|em|ul|ol|li|h[1-6]|blockquote|pre|code)\b/i;

export const looksLikeRichHtml = (input: string): boolean => {
  if (!input) return false;
  // If author uses fenced code blocks, treat as plain text (avoid stripping <p> inside code).
  if (input.includes("```")) return false;
  return RICH_HTML_TAG_RE.test(input);
};

// Convert rich-editor HTML into plain text while preserving conversational line breaks.
export const htmlToPlainTextPreserveNewlines = (html: string): string => {
  if (!html) return "";

  // Fallback for non-browser contexts
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  const processed = html
    // Block closings -> newline
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Table-ish -> sensible spacing
    .replace(/<\/(tr)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, "\t")
    // Strip opening tags that often appear inline
    .replace(/<p\b[^>]*>/gi, "")
    .replace(/<div\b[^>]*>/gi, "")
    .replace(/<li\b[^>]*>/gi, "")
    .replace(/<h[1-6]\b[^>]*>/gi, "")
    .replace(/<blockquote\b[^>]*>/gi, "")
    .replace(/<pre\b[^>]*>/gi, "")
    .replace(/<code\b[^>]*>/gi, "");

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = processed;
  const text = tempDiv.textContent || tempDiv.innerText || "";

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const normalizeChatInput = (value: string): string => {
  if (!value) return "";
  if (!looksLikeRichHtml(value)) return value;
  return htmlToPlainTextPreserveNewlines(value);
};
