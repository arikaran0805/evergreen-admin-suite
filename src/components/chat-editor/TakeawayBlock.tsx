import { useState, useRef, useEffect } from "react";
import { ChatMessage, TAKEAWAY_ICONS } from "./types";
import { cn } from "@/lib/utils";
import { Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TakeawayBlockProps {
  message: ChatMessage;
  isEditing: boolean;
  onEdit: (id: string, content: string, title?: string, icon?: string) => void;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
}

const TakeawayBlock = ({
  message,
  isEditing,
  onEdit,
  onStartEdit,
  onEndEdit,
}: TakeawayBlockProps) => {
  const [editContent, setEditContent] = useState(message.content);
  const [editTitle, setEditTitle] = useState(message.takeawayTitle || "One-Line Takeaway for Learners");
  const [editIcon, setEditIcon] = useState(message.takeawayIcon || "🧠");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
      return;
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleSave = () => {
    onEdit(message.id, editContent, editTitle, editIcon);
    onEndEdit();
  };

  const handleCancel = () => {
    setEditContent(message.content);
    setEditTitle(message.takeawayTitle || "One-Line Takeaway for Learners");
    setEditIcon(message.takeawayIcon || "🧠");
    onEndEdit();
  };

  if (isEditing) {
    return (
      <div className="my-4 p-4 rounded-xl border-2 border-primary/30 bg-muted/30 space-y-3">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-10 p-0 text-lg">
                {editIcon}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border border-border">
              <div className="grid grid-cols-4 gap-1 p-1">
                {TAKEAWAY_ICONS.map((icon) => (
                  <DropdownMenuItem
                    key={icon.value}
                    onClick={() => setEditIcon(icon.value)}
                    className="cursor-pointer justify-center text-lg p-2"
                  >
                    {icon.value}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Takeaway title..."
            className="flex-1 h-8 text-sm font-medium"
          />
        </div>
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[80px] bg-background resize-y outline-none text-sm leading-relaxed border rounded-lg p-3"
          placeholder="Enter takeaway content..."
        />
        <div className="text-[10px] text-muted-foreground">
          Ctrl/Cmd+Enter to save • Escape to cancel
        </div>
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7 px-2 text-xs">
            <X className="w-3 h-3 mr-1" />
            Cancel
          </Button>
          <Button variant="default" size="sm" onClick={handleSave} className="h-7 px-2 text-xs">
            <Check className="w-3 h-3 mr-1" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  const icon = message.takeawayIcon || "🧠";
  const title = message.takeawayTitle || "One-Line Takeaway for Learners";

  return (
    <div
      className={cn(
        "group my-4 rounded-xl overflow-hidden",
        "border-t border-b border-border/50",
        "bg-gradient-to-r from-muted/20 to-muted/10"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <span className="text-xl">{icon}</span>
        <span className="font-semibold text-sm text-foreground">{title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onStartEdit(message.id)}
        >
          <Pencil className="w-3 h-3" />
        </Button>
      </div>

      {/* Content */}
      <div className="px-4 py-3 pl-6 relative">
        <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-primary/40 rounded-full" />
        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  );
};

export default TakeawayBlock;
