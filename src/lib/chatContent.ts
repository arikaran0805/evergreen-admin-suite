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
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const normalizeChatInput = (value: string): string => {
  if (!value) return "";
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!looksLikeRichHtml(normalized)) return normalized;
  return htmlToPlainTextPreserveNewlines(normalized);
};

type ChatSegment = { speaker: string; content: string };

type Marker = { speaker: string; start: number; end: number };

// Separator for mixed content (chat + explanation)
const MIXED_CONTENT_SEPARATOR = /\n---\n/;

const SPEAKER_TOKEN_RE = /([^:\r\n]{1,60}):\s*/g;

const findChatMarkers = (text: string): Marker[] => {
  const markers: Marker[] = [];
  for (const m of text.matchAll(SPEAKER_TOKEN_RE)) {
    const idx = m.index ?? 0;
    const prev = idx > 0 ? text[idx - 1] : "";
    // Only treat as a marker at the start or after whitespace/newline.
    if (idx !== 0 && prev && !/\s/.test(prev)) continue;

    const speaker = (m[1] || "").trim();
    if (!speaker || !/[A-Za-z]/.test(speaker)) continue;

    markers.push({ speaker, start: idx, end: idx + m[0].length });
  }
  return markers;
};

export const extractChatSegments = (
  input: string,
  options?: { allowSingle?: boolean }
): ChatSegment[] => {
  const text = normalizeChatInput(input);
  if (!text.trim()) return [];

  // If mixed content, only parse the chat portion (before ---)
  const chatPortion = text.split(MIXED_CONTENT_SEPARATOR)[0];

  const markers = findChatMarkers(chatPortion);
  if (markers.length === 0) return [];
  if (!options?.allowSingle && markers.length < 2) return [];

  const segments: ChatSegment[] = [];
  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i];
    const nextStart = i + 1 < markers.length ? markers[i + 1].start : chatPortion.length;
    const content = chatPortion.slice(cur.end, nextStart).trim();
    if (content) segments.push({ speaker: cur.speaker, content });
  }

  return segments;
};

export const isChatTranscript = (input: string): boolean => {
  const text = normalizeChatInput(input);
  if (!text.trim()) return false;
  const chatPortion = text.split(MIXED_CONTENT_SEPARATOR)[0];
  return findChatMarkers(chatPortion).length >= 2;
};

// Extract the explanation portion after the --- separator
export const extractExplanation = (input: string): string | null => {
  const text = normalizeChatInput(input);
  const parts = text.split(MIXED_CONTENT_SEPARATOR);
  if (parts.length < 2) return null;
  const explanation = parts.slice(1).join("\n---\n").trim();
  return explanation || null;
};
