/**
 * CanvasEditor - Block-based canvas workspace
 * 
 * Features:
 * - Double-click/double-tap to add blocks
 * - Draggable blocks
 * - Floating "+" button
 * - Saves as structured JSON
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CanvasBlock,
  CanvasData,
  BlockKind,
  ContextMenuPosition,
  createEmptyBlock,
  parseCanvasContent,
  serializeCanvasContent,
  DEFAULT_BLOCK_WIDTH,
} from './types';
import DraggableBlock from './DraggableBlock';
import CanvasContextMenu from './CanvasContextMenu';

interface CanvasEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const CANVAS_PADDING = 60;
const GRID_SIZE = 20;

// Snap position to grid
const snapToGrid = (value: number): number => {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

const CanvasEditor = ({ value, onChange, className }: CanvasEditorProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasData, setCanvasData] = useState<CanvasData>(() => parseCanvasContent(value));
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  // Sync external value changes
  useEffect(() => {
    const parsed = parseCanvasContent(value);
    if (JSON.stringify(parsed) !== JSON.stringify(canvasData)) {
      setCanvasData(parsed);
    }
  }, [value]);

  // Notify parent of changes
  const updateAndNotify = useCallback((newData: CanvasData) => {
    setCanvasData(newData);
    onChange(serializeCanvasContent(newData));
  }, [onChange]);

  // Handle double-click/double-tap
  const handleCanvasInteraction = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scrollLeft = canvasRef.current.scrollLeft;
    const scrollTop = canvasRef.current.scrollTop;

    // Position for the context menu (viewport coords)
    const menuX = clientX;
    const menuY = clientY;

    // Position for the block (canvas coords)
    const canvasX = snapToGrid(clientX - rect.left + scrollLeft - DEFAULT_BLOCK_WIDTH / 2);
    const canvasY = snapToGrid(clientY - rect.top + scrollTop);

    setContextMenu({
      x: menuX,
      y: menuY,
      canvasX: Math.max(CANVAS_PADDING, canvasX),
      canvasY: Math.max(CANVAS_PADDING, canvasY),
    });
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // Only trigger on canvas background, not on blocks
    if ((e.target as HTMLElement).closest('.canvas-block')) return;
    handleCanvasInteraction(e.clientX, e.clientY);
  }, [handleCanvasInteraction]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.canvas-block')) return;
    
    const touch = e.changedTouches[0];
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (lastTap && now - lastTap.time < 300) {
      // Double tap detected
      const dx = Math.abs(touch.clientX - lastTap.x);
      const dy = Math.abs(touch.clientY - lastTap.y);
      if (dx < 30 && dy < 30) {
        handleCanvasInteraction(touch.clientX, touch.clientY);
        lastTapRef.current = null;
        return;
      }
    }

    lastTapRef.current = {
      time: now,
      x: touch.clientX,
      y: touch.clientY,
    };
  }, [handleCanvasInteraction]);

  // Add block from context menu
  const handleAddBlock = useCallback((kind: BlockKind) => {
    if (!contextMenu) return;

    const newBlock = createEmptyBlock(kind, contextMenu.canvasX, contextMenu.canvasY);
    const newData = {
      ...canvasData,
      blocks: [...canvasData.blocks, newBlock],
    };
    updateAndNotify(newData);
    setSelectedBlockId(newBlock.id);
    setContextMenu(null);
  }, [contextMenu, canvasData, updateAndNotify]);

  // Add block from floating button
  const handleAddBlockFromButton = useCallback((kind: BlockKind) => {
    // Find a good position for the new block
    const existingBlocks = canvasData.blocks;
    let y = CANVAS_PADDING;
    
    if (existingBlocks.length > 0) {
      const maxY = Math.max(...existingBlocks.map(b => b.y + b.h));
      y = maxY + 40;
    }

    const newBlock = createEmptyBlock(kind, CANVAS_PADDING, y);
    const newData = {
      ...canvasData,
      blocks: [...canvasData.blocks, newBlock],
    };
    updateAndNotify(newData);
    setSelectedBlockId(newBlock.id);
  }, [canvasData, updateAndNotify]);

  // Update block
  const handleUpdateBlock = useCallback((id: string, updates: Partial<CanvasBlock>) => {
    const newData = {
      ...canvasData,
      blocks: canvasData.blocks.map(block =>
        block.id === id ? { ...block, ...updates } : block
      ),
    };
    updateAndNotify(newData);
  }, [canvasData, updateAndNotify]);

  // Duplicate block
  const handleDuplicateBlock = useCallback((id: string) => {
    const block = canvasData.blocks.find(b => b.id === id);
    if (!block) return;

    const newBlock: CanvasBlock = {
      ...block,
      id: crypto.randomUUID(),
      x: block.x + 30,
      y: block.y + 30,
    };

    const newData = {
      ...canvasData,
      blocks: [...canvasData.blocks, newBlock],
    };
    updateAndNotify(newData);
    setSelectedBlockId(newBlock.id);
  }, [canvasData, updateAndNotify]);

  // Delete block
  const handleDeleteBlock = useCallback((id: string) => {
    const newData = {
      ...canvasData,
      blocks: canvasData.blocks.filter(block => block.id !== id),
    };
    updateAndNotify(newData);
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  }, [canvasData, selectedBlockId, updateAndNotify]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    const block = canvasData.blocks.find(b => b.id === active.id);
    if (!block) return;

    const newX = snapToGrid(Math.max(CANVAS_PADDING, block.x + delta.x));
    const newY = snapToGrid(Math.max(CANVAS_PADDING, block.y + delta.y));

    handleUpdateBlock(active.id as string, { x: newX, y: newY });
  }, [canvasData.blocks, handleUpdateBlock]);

  // Calculate canvas size based on blocks
  const canvasSize = {
    width: Math.max(
      1200,
      ...canvasData.blocks.map(b => b.x + b.w + CANVAS_PADDING * 2)
    ),
    height: Math.max(
      800,
      ...canvasData.blocks.map(b => b.y + b.h + CANVAS_PADDING * 2)
    ),
  };

  return (
    <div className={cn("relative flex flex-col", className)}>
      {/* Floating add button */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shadow-sm"
          onClick={() => handleAddBlockFromButton('text')}
        >
          <Plus className="h-4 w-4" />
          Text Block
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shadow-sm"
          onClick={() => handleAddBlockFromButton('chat')}
        >
          <Plus className="h-4 w-4" />
          Chat Block
        </Button>
      </div>

      {/* Canvas area */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          ref={canvasRef}
          className={cn(
            "relative overflow-auto bg-muted/20 rounded-lg border border-dashed border-border/50",
            "min-h-[600px] cursor-crosshair"
          )}
          style={{ width: '100%', height: '600px' }}
          onDoubleClick={handleDoubleClick}
          onTouchEnd={handleTouchEnd}
        >
          {/* Grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)`,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          />

          {/* Canvas content */}
          <div
            className="relative"
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              minWidth: '100%',
              minHeight: '100%',
            }}
          >
            {/* Empty state */}
            {canvasData.blocks.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                <Plus className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Double-click anywhere to add a block</p>
                <p className="text-xs opacity-70">or use the buttons above</p>
              </div>
            )}

            {/* Blocks */}
            {canvasData.blocks.map(block => (
              <div key={block.id} className="canvas-block">
                <DraggableBlock
                  block={block}
                  onUpdate={handleUpdateBlock}
                  onDuplicate={handleDuplicateBlock}
                  onDelete={handleDeleteBlock}
                  isSelected={selectedBlockId === block.id}
                  onSelect={setSelectedBlockId}
                />
              </div>
            ))}
          </div>
        </div>
      </DndContext>

      {/* Context menu */}
      {contextMenu && (
        <CanvasContextMenu
          position={contextMenu}
          onAddBlock={handleAddBlock}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default CanvasEditor;
