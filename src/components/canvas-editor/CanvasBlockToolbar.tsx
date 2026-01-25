/**
 * CanvasBlockToolbar - Toolbar for block manipulation
 */

import { GripVertical, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CanvasBlockToolbarProps {
  onDuplicate: () => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const CanvasBlockToolbar = ({ onDuplicate, onDelete, dragHandleProps }: CanvasBlockToolbarProps) => {
  return (
    <div className={cn(
      "absolute -top-8 left-0 flex items-center gap-0.5 rounded-md border border-border bg-background/95 backdrop-blur-sm px-1 py-0.5 shadow-sm",
      "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity"
    )}>
      <div
        {...dragHandleProps}
        className="flex items-center justify-center w-6 h-6 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        title="Drag to move"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onDuplicate}
        title="Duplicate block"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onDelete}
        title="Delete block"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default CanvasBlockToolbar;
