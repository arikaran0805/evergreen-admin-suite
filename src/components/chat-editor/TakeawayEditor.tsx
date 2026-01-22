/**
 * TakeawayEditor - TipTap-based editor for Takeaway blocks
 * 
 * Replaces the raw textarea with a unified TipTap editing experience
 * that matches ChatEditor behavior for consistency.
 */

import { useRef, useEffect, useState } from "react";
import { ChatEditor, ChatEditorRef } from "@/components/tiptap/ChatEditor";
import { TAKEAWAY_ICONS } from "./types";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TakeawayEditorProps {
  content: string;
  title: string;
  icon: string;
  onSave: (content: string, title: string, icon: string) => void;
  onCancel: () => void;
  codeTheme?: string;
}

const TakeawayEditor = ({
  content,
  title,
  icon,
  onSave,
  onCancel,
  codeTheme,
}: TakeawayEditorProps) => {
  const editorRef = useRef<ChatEditorRef>(null);
  const [editContent, setEditContent] = useState(content);
  const [editTitle, setEditTitle] = useState(title);
  const [editIcon, setEditIcon] = useState(icon);

  useEffect(() => {
    // Focus editor on mount
    setTimeout(() => editorRef.current?.focus(), 100);
  }, []);

  const handleSave = (markdown?: string) => {
    const finalContent = markdown ?? editContent;
    onSave(finalContent, editTitle, editIcon);
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="my-6 mx-2">
      <div className="relative p-5 rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/40 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/10 shadow-lg">
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />

        <div className="space-y-4">
          {/* Icon and title row */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 p-0 text-xl rounded-xl border-amber-300 bg-amber-100/50 hover:bg-amber-200/50 dark:bg-amber-900/30 dark:hover:bg-amber-800/40"
                >
                  {editIcon}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover border border-border shadow-lg z-50">
                <div className="grid grid-cols-4 gap-1 p-2">
                  {TAKEAWAY_ICONS.map((iconOption) => (
                    <DropdownMenuItem
                      key={iconOption.value}
                      onClick={() => setEditIcon(iconOption.value)}
                      className="cursor-pointer justify-center text-xl p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50"
                    >
                      {iconOption.value}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Takeaway title..."
              className="flex-1 h-10 text-sm font-semibold border-amber-300/50 bg-white/50 dark:bg-background/50 focus-visible:ring-amber-400"
            />
          </div>

          {/* TipTap-based content editor */}
          <div className="takeaway-editor-container">
            <ChatEditor
              ref={editorRef}
              value={editContent}
              onChange={setEditContent}
              onSave={handleSave}
              onCancel={handleCancel}
              placeholder="Enter your key takeaway..."
              isMentor={false}
              codeTheme={codeTheme}
              autoFocus
              className="takeaway-tiptap-editor"
            />
          </div>

          {/* Action buttons - additional save/cancel for clarity */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/50 dark:border-amber-800/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 px-3 text-xs hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave()}
              className="h-8 px-4 text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-md"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Save Takeaway
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeawayEditor;
