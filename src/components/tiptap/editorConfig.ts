/**
 * Unified TipTap Editor Configuration
 * 
 * Single source of truth for all editor extensions, shortcuts, and settings.
 * Both FullEditor and LightEditor consume from this config.
 */

import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import type { Extensions } from '@tiptap/react';
import { ExecutableCodeBlock } from './ExecutableCodeBlock';
import { AnnotationMark } from './AnnotationMark';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

// Detect platform for keyboard shortcuts display
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
export const modKey = isMac ? '⌘' : 'Ctrl';

/**
 * Keyboard shortcuts for reference display
 */
export const KEYBOARD_SHORTCUTS = {
  full: [
    { keys: `${modKey}+B`, action: 'Bold' },
    { keys: `${modKey}+I`, action: 'Italic' },
    { keys: `${modKey}+U`, action: 'Underline' },
    { keys: `${modKey}+Shift+S`, action: 'Strikethrough' },
    { keys: `${modKey}+Shift+7`, action: 'Numbered List' },
    { keys: `${modKey}+Shift+8`, action: 'Bullet List' },
    { keys: `${modKey}+Shift+B`, action: 'Blockquote' },
    { keys: `${modKey}+E`, action: 'Code Block' },
    { keys: `${modKey}+K`, action: 'Link' },
    { keys: `${modKey}+Z`, action: 'Undo' },
    { keys: `${modKey}+Shift+Z`, action: 'Redo' },
  ],
  light: [
    { keys: `${modKey}+B`, action: 'Bold' },
    { keys: `${modKey}+I`, action: 'Italic' },
    { keys: `${modKey}+K`, action: 'Link' },
    { keys: `${modKey}+\``, action: 'Inline Code' },
  ],
};

/**
 * Supported code block languages
 */
export const CODE_LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'plaintext', label: 'Plain Text' },
];

/**
 * Base link configuration used by all editors
 */
const linkConfig = Link.configure({
  openOnClick: false,
  HTMLAttributes: {
    target: '_blank',
    rel: 'noopener noreferrer',
    class: 'tiptap-link',
  },
});

/**
 * FullEditor Extensions
 * For Admin/Moderator content creation
 * Uses ExecutableCodeBlock for interactive code editing
 */
export const getFullEditorExtensions = (options?: {
  placeholder?: string;
  characterLimit?: number;
  useExecutableCodeBlocks?: boolean;
}): Extensions => {
  const useExecutable = options?.useExecutableCodeBlocks ?? true;
  
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: false, // Disabled - using ExecutableCodeBlock or CodeBlockLowlight
      code: {
        HTMLAttributes: { class: 'tiptap-inline-code' },
      },
      blockquote: {
        HTMLAttributes: { class: 'tiptap-blockquote' },
      },
    }),
    // Use ExecutableCodeBlock for interactive editing, or CodeBlockLowlight for static
    ...(useExecutable 
      ? [ExecutableCodeBlock]
      : [CodeBlockLowlight.configure({
          lowlight,
          defaultLanguage: 'python',
          HTMLAttributes: { class: 'tiptap-code-block' },
        })]
    ),
    linkConfig,
    Underline,
    Highlight.configure({
      multicolor: true,
      HTMLAttributes: { class: 'tiptap-highlight' },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: 'tiptap-table' },
    }),
    TableRow,
    TableCell.configure({
      HTMLAttributes: { class: 'tiptap-table-cell' },
    }),
    TableHeader.configure({
      HTMLAttributes: { class: 'tiptap-table-header' },
    }),
    Image.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: { class: 'tiptap-image' },
    }),
    Placeholder.configure({
      placeholder: options?.placeholder ?? 'Write your content here...',
      emptyEditorClass: 'tiptap-empty',
    }),
    // Annotation mark for inline feedback
    AnnotationMark,
    ...(options?.characterLimit 
      ? [CharacterCount.configure({ limit: options.characterLimit })] 
      : [CharacterCount]
    ),
  ];
};

/**
 * LightEditor Extensions
 * For comments/replies - restricted feature set
 */
export const getLightEditorExtensions = (options?: {
  placeholder?: string;
  characterLimit?: number;
}): Extensions => [
  StarterKit.configure({
    // Disable block-level elements
    heading: false,
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    // Keep inline elements
    bold: {},
    italic: {},
    strike: false,
    code: {
      HTMLAttributes: { class: 'tiptap-inline-code' },
    },
  }),
  linkConfig,
  Placeholder.configure({
    placeholder: options?.placeholder ?? 'Write a comment...',
    emptyEditorClass: 'tiptap-empty',
  }),
  CharacterCount.configure({ 
    limit: options?.characterLimit ?? 2000 
  }),
];

/**
 * Extensions for content rendering (read-only)
 * Matches FullEditor for proper HTML generation
 * Includes AnnotationMark for rendering annotated content
 */
export const getRenderExtensions = (): Extensions => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },
    codeBlock: false,
  }),
  CodeBlockLowlight.configure({
    lowlight,
    HTMLAttributes: { class: 'tiptap-code-block' },
  }),
  linkConfig,
  Underline,
  Highlight.configure({ multicolor: true }),
  Table,
  TableRow,
  TableCell,
  TableHeader,
  Image,
  // Include AnnotationMark for rendering annotated content
  AnnotationMark,
];

/**
 * Default empty document
 */
export const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

/**
 * Character limits
 */
export const CHARACTER_LIMITS = {
  comment: 2000,
  reply: 1000,
  excerpt: 300,
  fullEditor: undefined, // No limit for full editor
};

export { lowlight };
