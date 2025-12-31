import { useState } from "react";
import { ContentBlock, BlockType } from "./types";
import { ChatStyleEditor } from "@/components/chat-editor";
import RichTextEditor from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import {
  GripVertical,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pencil,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface BlockItemProps {
  block: ContentBlock;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  courseType?: string;
  codeTheme?: string;
}

export const SortableBlockItem = ({
  block,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleCollapse,
  isFirst,
  isLast,
  courseType,
  codeTheme,
}: BlockItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const BlockIcon = block.type === "chat" ? MessageCircle : FileText;
  const blockLabel = block.type === "chat" ? "Chat Editor" : "Rich Text Editor";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative border rounded-lg bg-card transition-all",
        isDragging && "shadow-lg z-50",
        block.collapsed && "border-muted"
      )}
    >
      {/* Block Header with Actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 rounded-t-lg">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onMoveUp(block.id)}
          disabled={isFirst}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onMoveDown(block.id)}
          disabled={isLast}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 flex-1">
          <BlockIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{blockLabel}</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onToggleCollapse(block.id)}
        >
          {block.collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={() => onDelete(block.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Block Content */}
      {!block.collapsed && (
        <div className="p-4">
          {block.type === "chat" ? (
            <ChatStyleEditor
              value={block.content}
              onChange={(value) => onUpdate(block.id, value)}
              courseType={courseType}
              placeholder="Start a conversation..."
              codeTheme={codeTheme}
            />
          ) : (
            <RichTextEditor
              value={block.content}
              onChange={(value) => onUpdate(block.id, value)}
              placeholder="Write your content here..."
            />
          )}
        </div>
      )}
    </div>
  );
};
