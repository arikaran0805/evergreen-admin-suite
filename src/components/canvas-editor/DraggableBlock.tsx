/**
 * DraggableBlock - Wrapper component for canvas blocks
 */

import { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { CanvasBlock, BlockKind } from './types';
import CanvasBlockToolbar from './CanvasBlockToolbar';
import { RichTextEditor } from '@/components/tiptap';
import { ChatStyleEditor } from '@/components/chat-editor';
import { FileText, MessageCircle } from 'lucide-react';

interface DraggableBlockProps {
  block: CanvasBlock;
  onUpdate: (id: string, updates: Partial<CanvasBlock>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const DraggableBlock = ({
  block,
  onUpdate,
  onDuplicate,
  onDelete,
  isSelected,
  onSelect,
}: DraggableBlockProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: { block },
  });

  const style = {
    position: 'absolute' as const,
    left: block.x,
    top: block.y,
    width: block.w,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : isSelected ? 10 : 1,
  };

  const handleContentChange = (content: string) => {
    onUpdate(block.id, { content });
  };

  const handleFocus = () => {
    setIsFocused(true);
    onSelect(block.id);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if focus is moving to another element within this block
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsFocused(false);
  };

  // Resize observer to track actual height
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (Math.abs(height - block.h) > 10) {
          onUpdate(block.id, { h: height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [block.id, block.h, onUpdate]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (node) (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={style}
      className={cn(
        "group relative rounded-lg border bg-background transition-all duration-150",
        isDragging && "opacity-50 shadow-2xl",
        isFocused || isSelected
          ? "border-primary shadow-md ring-1 ring-primary/20"
          : "border-border/50 hover:border-border"
      )}
      onClick={() => onSelect(block.id)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Block type indicator */}
      <div className="absolute -left-8 top-2 flex items-center justify-center w-6 h-6 rounded bg-muted/50 text-muted-foreground">
        {block.kind === 'text' ? (
          <FileText className="h-3.5 w-3.5" />
        ) : (
          <MessageCircle className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Toolbar */}
      <CanvasBlockToolbar
        onDuplicate={() => onDuplicate(block.id)}
        onDelete={() => onDelete(block.id)}
        dragHandleProps={{ ...listeners, ...attributes }}
      />

      {/* Content */}
      <div className="p-4 min-h-[100px]">
        {block.kind === 'text' ? (
          <RichTextEditor
            value={block.content}
            onChange={handleContentChange}
            placeholder="Write your content here..."
            className="min-h-[80px]"
          />
        ) : (
          <ChatStyleEditor
            value={block.content}
            onChange={handleContentChange}
            placeholder="Start a conversation..."
            courseType="python"
          />
        )}
      </div>
    </div>
  );
};

export default DraggableBlock;
