/**
 * CanvasRenderer - Read-only renderer for canvas content
 * 
 * Displays blocks in reading order (top to bottom, left to right)
 * for student view while maintaining visual layout
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  CanvasBlock, 
  parseCanvasContent, 
  sortBlocksForReading,
  isCanvasContent 
} from './types';
import { RichTextRenderer } from '@/components/tiptap';
import { ChatConversationView } from '@/components/chat-editor';

interface CanvasRendererProps {
  content: string;
  className?: string;
  codeTheme?: string;
}

const CanvasRenderer = ({ content, className, codeTheme }: CanvasRendererProps) => {
  const blocks = useMemo(() => {
    if (!isCanvasContent(content)) return [];
    const data = parseCanvasContent(content);
    return sortBlocksForReading(data.blocks);
  }, [content]);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {blocks.map((block) => (
        <div key={block.id} className="canvas-rendered-block">
          {block.kind === 'text' ? (
            <RichTextRenderer content={block.content} />
          ) : (
            <ChatConversationView
              content={block.content}
              codeTheme={codeTheme}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default CanvasRenderer;
