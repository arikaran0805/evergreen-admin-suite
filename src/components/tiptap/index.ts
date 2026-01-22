/**
 * Unified TipTap Editor System
 * 
 * THREE editors:
 * - FullEditor: Admin/Moderator content creation (JSON storage)
 * - LightEditor: Comments/replies (JSON storage)
 * - ChatEditor: Chat-style content (Markdown storage)
 */

// Editors
export { FullEditor, type FullEditorProps, type FullEditorRef } from './FullEditor';
export { LightEditor, type LightEditorProps, type LightEditorRef } from './LightEditor';
export { ChatEditor, type ChatEditorProps, type ChatEditorRef } from './ChatEditor';

// Legacy exports (deprecated - use FullEditor instead)
export { RichTextEditor, type RichTextEditorProps, type RichTextEditorRef } from './RichTextEditor';
export { RichTextRenderer } from './RichTextRenderer';

// Toolbars
export { FullEditorToolbar } from './FullEditorToolbar';
export { EditorToolbar } from './EditorToolbar';

// Config
export * from './editorConfig';
