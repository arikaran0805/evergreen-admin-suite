/**
 * Calculate estimated reading time based on content length
 * Average reading speed: 200-250 words per minute
 * We use 200 WPM for technical content (code, tutorials)
 */

import { isTipTapJSON, parseContent, extractPlainText } from './tiptapMigration';

const WORDS_PER_MINUTE = 200;

/**
 * Strip HTML tags from content to get plain text
 */
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Count words in a string (handles both HTML and TipTap JSON)
 */
const countWords = (text: string): number => {
  if (!text) return 0;
  
  // Check if it's TipTap JSON
  if (isTipTapJSON(text)) {
    try {
      const parsed = parseContent(text);
      const plainText = extractPlainText(parsed);
      const words = plainText.split(/\s+/).filter(word => word.length > 0);
      return words.length;
    } catch {
      return 0;
    }
  }
  
  // Strip HTML and count words
  const plainText = stripHtml(text);
  const words = plainText.split(/\s+/).filter(word => word.length > 0);
  return words.length;
};

/**
 * Calculate reading time in minutes
 * Returns minimum of 1 minute
 */
export const calculateReadingTime = (content: string | null | undefined): number => {
  if (!content) return 1;
  const wordCount = countWords(content);
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
  return Math.max(1, minutes);
};

/**
 * Format reading time for display
 * Returns formatted string like "5 min" or "1 min"
 */
export const formatReadingTime = (content: string | null | undefined): string => {
  const minutes = calculateReadingTime(content);
  return `${minutes} min`;
};

/**
 * Calculate total reading time for multiple posts
 */
export const calculateTotalReadingTime = (posts: Array<{ content?: string | null }>): number => {
  return posts.reduce((total, post) => total + calculateReadingTime(post.content), 0);
};

/**
 * Format total reading time for display
 * Returns hours and minutes for longer content
 */
export const formatTotalReadingTime = (posts: Array<{ content?: string | null }>): string => {
  const totalMinutes = calculateTotalReadingTime(posts);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
};
