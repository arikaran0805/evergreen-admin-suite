/**
 * Unified TipTap Editor Configuration
 *
 * ✅ Single schema across FullEditor, LightEditor, Preview
 * ✅ Executable code blocks everywhere
 * ✅ Annotation mark registered everywhere
 * ❌ No static codeBlock fallbacks
 */

import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';

import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

import type { Extensions } from '@tiptap/react';

import { ExecutableCodeBlock } from './ExecutableCodeBlock';
import { AnnotationMark } from './AnnotationMark';

/* -------------------------------------------------- */
/* Platform shortcut helper */
/* -------------------------------------------------- */

const isMac =
  typeof navigator !== 'undefined' &&
  navigator.platform.toUpperCase().includes('MAC');

export const modKey = isMac ? '⌘' : 'Ctrl';

/* -------------------------------------------------- */
/* Keyboard shortcuts for reference display */
/* -------------------------------------------------- */

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

/* -------------------------------------------------- */
/* Supported code block languages */
/* -------------------------------------------------- */

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

/* -------------------------------------------------- */
/* Shared Link config */
/* -------------------------------------------------- */

const linkConfig = Link.configure({
  openOnClick: false,
  HTMLAttributes: {
    target: '_blank',
    rel: 'noopener noreferrer',
    class: 'tiptap-link',
  },
});

/* -------------------------------------------------- */
/* Shared base schema (USED EVERYWHERE) */
/* -------------------------------------------------- */

const baseExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },

    // ❌ NEVER use default codeBlock
    codeBlock: false,

    code: {
      HTMLAttributes: { class: 'tiptap-inline-code' },
    },

    blockquote: {
      HTMLAttributes: { class: 'tiptap-blockquote' },
    },
  }),

  // ✅ Custom executable code node (always registered)
  ExecutableCodeBlock,

  // ✅ Annotation as real TipTap mark
  AnnotationMark,

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
];

/* -------------------------------------------------- */
/* FullEditor – Admin / Moderator */
/* -------------------------------------------------- */

export const getFullEditorExtensions = (options?: {
  placeholder?: string;
  characterLimit?: number;
  // Optional: allows callers (e.g. FullEditor) to pass stored annotation metadata
  // for any extension/plugin that may need it. (Schema already includes AnnotationMark.)
  annotations?: unknown;
}): Extensions => [
  ...baseExtensions,

  Placeholder.configure({
    placeholder: options?.placeholder ?? 'Write your content here…',
    emptyEditorClass: 'tiptap-empty',
  }),

  options?.characterLimit
    ? CharacterCount.configure({ limit: options.characterLimit })
    : CharacterCount,
];

/* -------------------------------------------------- */
/* LightEditor – Comments / Replies */
/* (UI restricted, schema NOT restricted) */
/* -------------------------------------------------- */

export const getLightEditorExtensions = (options?: {
  placeholder?: string;
  characterLimit?: number;
}): Extensions => [
  // Keep schema SAME, restrict via toolbar/UI only
  ...baseExtensions,

  Placeholder.configure({
    placeholder: options?.placeholder ?? 'Write a comment…',
    emptyEditorClass: 'tiptap-empty',
  }),

  CharacterCount.configure({
    limit: options?.characterLimit ?? 2000,
  }),
];

/* -------------------------------------------------- */
/* Renderer / Preview / Split View */
/* -------------------------------------------------- */

export const getRenderExtensions = (): Extensions => [
  // 🔑 SAME schema as editors
  ...baseExtensions,
];

/* -------------------------------------------------- */
/* Defaults */
/* -------------------------------------------------- */

export const EMPTY_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export const CHARACTER_LIMITS = {
  comment: 2000,
  reply: 1000,
  excerpt: 300,
  fullEditor: undefined,
};
