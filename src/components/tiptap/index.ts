/**
 * Unified TipTap Editor System
 * 
 * TWO editors only:
 * - FullEditor: Admin/Moderator content creation
 * - LightEditor: Comments/replies
 */

// Editors
export { FullEditor, type FullEditorProps, type FullEditorRef } from './FullEditor';
export { LightEditor, type LightEditorProps, type LightEditorRef } from './LightEditor';

// Legacy exports (deprecated - use FullEditor instead)
export { RichTextEditor, type RichTextEditorProps, type RichTextEditorRef } from './RichTextEditor';
export { RichTextRenderer } from './RichTextRenderer';

// Toolbars
export { FullEditorToolbar } from './FullEditorToolbar';
export { EditorToolbar } from './EditorToolbar';

// Config
export * from './editorConfig';
