/**
 * FullEditor Toolbar
 * 
 * Complete toolbar for admin/moderator content editing.
 * Includes all formatting options: headings, lists, code blocks, tables, images.
 */

import { type Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code2, Link as LinkIcon,
  Undo, Redo, Heading1, Heading2, Heading3, Minus, Keyboard,
  Table as TableIcon, Image as ImageIcon, Highlighter,
} from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useState, useCallback } from 'react';
import { KEYBOARD_SHORTCUTS, CODE_LANGUAGES } from './editorConfig';

interface FullEditorToolbarProps {
  editor: Editor | null;
  className?: string;
}

export function FullEditorToolbar({ editor, className }: FullEditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);

  const setLink = useCallback(() => {
    if (!editor) return;
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange('link')
        .setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run();
    }
    setLinkUrl('');
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const insertImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    const url = imageUrl.startsWith('http') ? imageUrl : `https://${imageUrl}`;
    editor.chain().focus().setImage({ src: url }).run();
    setImageUrl('');
    setShowImageInput(false);
  }, [editor, imageUrl]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn('tiptap-toolbar rounded-t-lg', className)}>
      {/* Text formatting */}
      <div className="tiptap-toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (⌘B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (⌘I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (⌘U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Headings */}
      <div className="tiptap-toolbar-group">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs">
              <Heading1 className="w-4 h-4" />
              <span className="hidden sm:inline">Heading</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 className="w-4 h-4 mr-2" /> Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="w-4 h-4 mr-2" /> Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="w-4 h-4 mr-2" /> Heading 3
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
              <Minus className="w-4 h-4 mr-2" /> Normal text
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Lists */}
      <div className="tiptap-toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Block elements */}
      <div className="tiptap-toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        
        {/* Code block with language selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 w-8 p-0', editor.isActive('codeBlock') && 'bg-primary/10 text-primary')}
              title="Code Block"
            >
              <Code2 className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Select language</p>
              <Select
                value={editor.getAttributes('codeBlock').language || 'python'}
                onValueChange={(lang) => {
                  if (editor.isActive('codeBlock')) {
                    editor.chain().focus().updateAttributes('codeBlock', { language: lang }).run();
                  } else {
                    editor.chain().focus().toggleCodeBlock().updateAttributes('codeBlock', { language: lang }).run();
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CODE_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value} className="text-xs">
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Table */}
      <div className="tiptap-toolbar-group">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 w-8 p-0', editor.isActive('table') && 'bg-primary/10 text-primary')}
              title="Table"
            >
              <TableIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={insertTable}>
              Insert Table (3×3)
            </DropdownMenuItem>
            {editor.isActive('table') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>
                  Add Column Before
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
                  Add Column After
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
                  Add Row Before
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                  Add Row After
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  className="text-destructive"
                >
                  Delete Table
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Link & Image */}
      <div className="tiptap-toolbar-group">
        <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 w-8 p-0', editor.isActive('link') && 'bg-primary/10 text-primary')}
              onClick={() => {
                setLinkUrl(editor.getAttributes('link').href || '');
                setShowLinkInput(true);
              }}
              title="Insert Link (⌘K)"
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="flex gap-2">
              <Input
                placeholder="Enter URL..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setLink())}
                className="flex-1"
              />
              <Button size="sm" onClick={setLink}>
                {editor.isActive('link') ? 'Update' : 'Add'}
              </Button>
            </div>
            {editor.isActive('link') && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-destructive"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setShowLinkInput(false);
                }}
              >
                Remove Link
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <Popover open={showImageInput} onOpenChange={setShowImageInput}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert Image">
              <ImageIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="flex gap-2">
              <Input
                placeholder="Image URL..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), insertImage())}
                className="flex-1"
              />
              <Button size="sm" onClick={insertImage}>Insert</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Undo/Redo */}
      <div className="tiptap-toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (⌘Z)"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (⌘⇧Z)"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="flex-1" />

      {/* Keyboard shortcuts */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1 text-muted-foreground">
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shortcuts</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <div className="space-y-1">
            <h4 className="font-medium text-sm mb-2">Keyboard Shortcuts</h4>
            {KEYBOARD_SHORTCUTS.full.map((s) => (
              <div key={s.action} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{s.action}</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Toolbar button component
function ToolbarButton({ onClick, isActive, disabled, title, children }: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-8 w-8 p-0',
        isActive && 'bg-primary/10 text-primary',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </Button>
  );
}

export default FullEditorToolbar;
