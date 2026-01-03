import { useState, useCallback } from "react";
import { FreeformCanvas, FreeformCanvasViewer, FreeformCanvasData } from "./freeform";
import { ChatMessage } from "./types";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, GripVertical, ArrowUp, ArrowDown, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FreeformBlockProps {
  message: ChatMessage;
  isEditing: boolean;
  isEditMode: boolean;
  onEdit: (id: string, content: string, freeformData?: FreeformCanvasData) => void;
  onStartEdit: (id: string | null) => void;
  onEndEdit: () => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  dragHandleProps?: any;
}

export const FreeformBlock = ({
  message,
  isEditing,
  isEditMode,
  onEdit,
  onStartEdit,
  onEndEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  dragHandleProps,
}: FreeformBlockProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleSave = useCallback((data: FreeformCanvasData) => {
    onEdit(message.id, JSON.stringify(data), data);
  }, [message.id, onEdit]);

  // Action buttons component
  const ActionButtons = () => (
    <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 backdrop-blur-sm border rounded-lg px-1 py-1 shadow-sm flex-shrink-0 mt-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 cursor-grab active:cursor-grabbing"
        {...dragHandleProps}
      >
        <GripVertical className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onMoveUp}
        disabled={isFirst}
      >
        <ArrowUp className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onMoveDown}
        disabled={isLast}
      >
        <ArrowDown className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => onStartEdit(message.id)}
      >
        <Pencil className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setIsFullscreen(true)}
      >
        <Maximize2 className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-destructive hover:text-destructive"
        onClick={() => onDelete(message.id)}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );

  // If editing, show the full canvas editor
  if (isEditing) {
    return (
      <div className="group relative flex items-start gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <FreeformCanvas
              initialData={message.freeformData}
              onSave={handleSave}
              readOnly={false}
              className="min-h-[400px]"
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onEndEdit}
              >
                Done Editing
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If not editing, show the viewer
  return (
    <>
      <div className="group relative flex items-start gap-2 mb-4">
        <div className="flex-1 min-w-0">
          {message.freeformData ? (
            <FreeformCanvasViewer
              data={message.freeformData}
              className={cn(
                "min-h-[200px] max-h-[400px]",
                !isEditMode && "cursor-pointer hover:shadow-lg transition-shadow"
              )}
            />
          ) : (
            <div 
              className="flex items-center justify-center min-h-[200px] rounded-xl border border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onStartEdit(message.id)}
            >
              <div className="text-center text-muted-foreground">
                <Pencil className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Click to start drawing</p>
                <p className="text-xs opacity-70">Create a visual explanation</p>
              </div>
            </div>
          )}
        </div>
        {isEditMode && !isEditing && <ActionButtons />}
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Visual Explanation</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(false)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4 pt-2 overflow-auto">
            {isEditMode ? (
              <FreeformCanvas
                initialData={message.freeformData}
                onSave={handleSave}
                readOnly={false}
                className="h-[calc(95vh-100px)]"
              />
            ) : message.freeformData ? (
              <FreeformCanvasViewer
                data={message.freeformData}
                className="h-[calc(95vh-100px)]"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
