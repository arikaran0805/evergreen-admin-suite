/**
 * Canvas Editor Types
 * 
 * Defines the data structures for block-based canvas editing
 */

export type BlockKind = 'text' | 'chat';

export interface CanvasBlock {
  id: string;
  kind: BlockKind;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
}

export interface CanvasData {
  version: 1;
  blocks: CanvasBlock[];
}

export interface ContextMenuPosition {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
}

export const DEFAULT_BLOCK_WIDTH = 600;
export const DEFAULT_BLOCK_HEIGHT = 200;

export const createEmptyBlock = (kind: BlockKind, x: number, y: number): CanvasBlock => ({
  id: crypto.randomUUID(),
  kind,
  x,
  y,
  w: DEFAULT_BLOCK_WIDTH,
  h: DEFAULT_BLOCK_HEIGHT,
  content: '',
});

export const isCanvasContent = (content: string): boolean => {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    return parsed?.version === 1 && Array.isArray(parsed?.blocks);
  } catch {
    return false;
  }
};

export const parseCanvasContent = (content: string): CanvasData => {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.version === 1 && Array.isArray(parsed?.blocks)) {
      return parsed;
    }
  } catch {
    // Not valid canvas content
  }
  return { version: 1, blocks: [] };
};

export const serializeCanvasContent = (data: CanvasData): string => {
  return JSON.stringify(data);
};

// Sort blocks for reading order (top to bottom, then left to right)
export const sortBlocksForReading = (blocks: CanvasBlock[]): CanvasBlock[] => {
  return [...blocks].sort((a, b) => {
    // Primary sort by Y position (top to bottom)
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > 50) return yDiff; // If Y difference is significant
    // Secondary sort by X position (left to right)
    return a.x - b.x;
  });
};
