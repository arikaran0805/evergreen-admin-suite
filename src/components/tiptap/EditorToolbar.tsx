/**
 * TipTap Editor Toolbar
 * 
 * Secure toolbar with safe formatting options only.
 * Excludes raw HTML, scripts, iframes, and inline styles.
 */

import { type Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code2,
  Link as LinkIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Keyboard,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useState, useCallback } from 'react';

// Detect platform for keyboard shortcuts
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? '⌘' : 'Ctrl';

const KEYBOARD_SHORTCUTS = [
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
];

interface EditorToolbarProps {
  editor: Editor | null;
  showCodeBlock?: boolean; // Admin-only feature
  className?: string;
}

export const EditorToolbar = ({ editor, showCodeBlock = true, className }: EditorToolbarProps) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setShowLinkInput(false);
      return;
    }

    // Ensure URL has protocol
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' })
      .run();

    setLinkUrl('');
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const openLinkInput = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkInput(true);
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn(
      'flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/50 rounded-t-lg',
      className
    )}>
      {/* Text formatting */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
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
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarGroup>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs">
              <Heading1 className="w-4 h-4" />
              <span className="hidden sm:inline">Heading</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 className="w-4 h-4 mr-2" />
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="w-4 h-4 mr-2" />
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="w-4 h-4 mr-2" />
              Heading 3
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
              <Minus className="w-4 h-4 mr-2" />
              Normal text
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarGroup>
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
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Block elements */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        
        {showCodeBlock && (
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code2 className="w-4 h-4" />
          </ToolbarButton>
        )}
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Link */}
      <ToolbarGroup>
        <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 w-8 p-0', editor.isActive('link') && 'bg-primary/10 text-primary')}
              onClick={openLinkInput}
              title="Insert Link"
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setLink();
                  }
                }}
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
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Undo/Redo */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </ToolbarGroup>

      {/* Spacer */}
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
            {KEYBOARD_SHORTCUTS.map((shortcut) => (
              <div key={shortcut.action} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{shortcut.action}</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">{shortcut.keys}</kbd>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Sub-components for toolbar organization
const ToolbarGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center">{children}</div>
);

const ToolbarDivider = () => (
  <div className="w-px h-6 bg-border mx-1" />
);

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

const ToolbarButton = ({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) => (
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

export default EditorToolbar;
