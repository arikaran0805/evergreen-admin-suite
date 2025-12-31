import { useState, useCallback } from "react";
import { ContentBlock, BlockType, BLOCK_TYPES } from "./types";
import { SortableBlockItem } from "./BlockItem";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MousePointerClick,
  Plus,
  MessageCircle,
  FileText,
  GripVertical,
  ChevronRight,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

const generateId = () => Math.random().toString(36).substr(2, 9);

// Separator between blocks in serialized content
const BLOCK_SEPARATOR = "\n\n---BLOCK---\n\n";
const BLOCK_TYPE_PREFIX = "<!-- BLOCK_TYPE:";
const BLOCK_TYPE_SUFFIX = " -->\n";

interface CanvasEditorProps {
  value: string;
  onChange: (value: string) => void;
  courseType?: string;
  codeTheme?: string;
}

// Parse serialized content into blocks
const parseBlocks = (content: string): ContentBlock[] => {
  if (!content || !content.includes(BLOCK_SEPARATOR)) {
    // If no blocks, return empty array or single block based on content
    if (!content.trim()) return [];
    
    // Check if content has a type prefix
    if (content.startsWith(BLOCK_TYPE_PREFIX)) {
      const typeMatch = content.match(/<!-- BLOCK_TYPE:(chat|richtext) -->\n/);
      if (typeMatch) {
        const type = typeMatch[1] as BlockType;
        const blockContent = content.replace(typeMatch[0], "");
        return [{
          id: generateId(),
          type,
          content: blockContent,
          collapsed: false,
        }];
      }
    }
    
    // Legacy content without block markers - treat as richtext
    return [{
      id: generateId(),
      type: "richtext",
      content: content,
      collapsed: false,
    }];
  }

  const parts = content.split(BLOCK_SEPARATOR);
  return parts.map((part) => {
    const typeMatch = part.match(/<!-- BLOCK_TYPE:(chat|richtext) -->\n/);
    const type: BlockType = typeMatch ? (typeMatch[1] as BlockType) : "richtext";
    const blockContent = typeMatch ? part.replace(typeMatch[0], "") : part;

    return {
      id: generateId(),
      type,
      content: blockContent,
      collapsed: false,
    };
  });
};

// Serialize blocks back to content string
const serializeBlocks = (blocks: ContentBlock[]): string => {
  return blocks
    .map((block) => `${BLOCK_TYPE_PREFIX}${block.type}${BLOCK_TYPE_SUFFIX}${block.content}`)
    .join(BLOCK_SEPARATOR);
};

export const CanvasEditor = ({
  value,
  onChange,
  courseType,
  codeTheme,
}: CanvasEditorProps) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => parseBlocks(value));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const syncBlocks = useCallback(
    (newBlocks: ContentBlock[]) => {
      setBlocks(newBlocks);
      onChange(serializeBlocks(newBlocks));
    },
    [onChange]
  );

  const handleAddBlock = (type: BlockType) => {
    const newBlock: ContentBlock = {
      id: generateId(),
      type,
      content: "",
      collapsed: false,
    };
    syncBlocks([...blocks, newBlock]);
    setShowBlockMenu(false);
  };

  const handleUpdateBlock = (id: string, content: string) => {
    syncBlocks(
      blocks.map((b) => (b.id === id ? { ...b, content } : b))
    );
  };

  const handleDeleteBlock = (id: string) => {
    syncBlocks(blocks.filter((b) => b.id !== id));
  };

  const handleMoveUp = (id: string) => {
    const index = blocks.findIndex((b) => b.id === id);
    if (index > 0) {
      syncBlocks(arrayMove(blocks, index, index - 1));
    }
  };

  const handleMoveDown = (id: string) => {
    const index = blocks.findIndex((b) => b.id === id);
    if (index < blocks.length - 1) {
      syncBlocks(arrayMove(blocks, index, index + 1));
    }
  };

  const handleToggleCollapse = (id: string) => {
    setBlocks(
      blocks.map((b) => (b.id === id ? { ...b, collapsed: !b.collapsed } : b))
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      syncBlocks(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    // Only trigger if clicking on the empty canvas area, not on blocks
    if ((e.target as HTMLElement).closest(".block-item")) return;
    setShowBlockMenu(true);
  };

  const handleDragFromSidebar = (type: BlockType) => {
    handleAddBlock(type);
  };

  return (
    <div className="flex gap-4 min-h-[500px]">
      {/* Main Canvas Area */}
      <div
        className="flex-1 relative bg-muted/20 rounded-xl border-2 border-dashed border-border p-4 overflow-auto"
        onDoubleClick={handleCanvasDoubleClick}
      >
        {blocks.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground">
              <MousePointerClick className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Double-click to add a block</p>
              <p className="text-sm">Or drag a block from the sidebar</p>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <div key={block.id} className="block-item">
                    <SortableBlockItem
                      block={block}
                      onUpdate={handleUpdateBlock}
                      onDelete={handleDeleteBlock}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      onToggleCollapse={handleToggleCollapse}
                      isFirst={index === 0}
                      isLast={index === blocks.length - 1}
                      courseType={courseType}
                      codeTheme={codeTheme}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Block Add Menu (shown on double-click) */}
        {showBlockMenu && (
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowBlockMenu(false)}
          >
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover border rounded-lg shadow-lg p-2 min-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs text-muted-foreground px-2 py-1.5 font-medium">
                Add Block
              </p>
              <button
                className="w-full flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-md transition-colors text-left"
                onClick={() => handleAddBlock("chat")}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">Chat Editor</span>
              </button>
              <button
                className="w-full flex items-center gap-2 px-2 py-2 hover:bg-muted rounded-md transition-colors text-left"
                onClick={() => handleAddBlock("richtext")}
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm">Rich Text Editor</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar with Vertical Tab Toggle */}
      <div className="flex-shrink-0 flex">
        {/* Vertical Tab Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex flex-col items-center justify-start gap-1 py-3 px-1 bg-muted/50 hover:bg-muted border-y border-l rounded-l-md transition-colors cursor-pointer"
        >
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              sidebarOpen ? "rotate-180" : ""
            }`}
          />
          <span className="text-[10px] font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180 select-none">
            Blocks
          </span>
        </button>

        {/* Sidebar Content */}
        <Card
          className={`flex flex-col min-h-0 transition-all duration-300 rounded-l-none border-l-0 ${
            sidebarOpen ? "w-56" : "w-0 overflow-hidden border-0 p-0"
          }`}
        >
          <div className={`p-4 border-b flex-shrink-0 ${!sidebarOpen ? "hidden" : ""}`}>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm whitespace-nowrap">Block Library</h3>
            </div>
          </div>

          <ScrollArea className={`flex-1 ${!sidebarOpen ? "hidden" : ""}`}>
            <div className="p-2 space-y-2">
              {BLOCK_TYPES.map((blockType) => {
                const Icon = blockType.type === "chat" ? MessageCircle : FileText;
                return (
                  <div
                    key={blockType.type}
                    draggable
                    onDragEnd={() => handleDragFromSidebar(blockType.type)}
                    className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-all"
                    onClick={() => handleAddBlock(blockType.type)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{blockType.label}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};
