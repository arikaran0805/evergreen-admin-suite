export type FreeformTool = 
  | 'select' 
  | 'pen' 
  | 'pencil' 
  | 'highlighter' 
  | 'rectangle' 
  | 'circle' 
  | 'arrow' 
  | 'line' 
  | 'text' 
  | 'eraser';

export interface FreeformCanvasData {
  canvasJson: string;
  width: number;
  height: number;
  version: number;
}

export const FREEFORM_COLORS = [
  { name: 'Black', value: '#1a1a1a' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
];

export const HIGHLIGHTER_COLORS = [
  { name: 'Yellow', value: 'rgba(250, 204, 21, 0.4)' },
  { name: 'Green', value: 'rgba(74, 222, 128, 0.4)' },
  { name: 'Blue', value: 'rgba(96, 165, 250, 0.4)' },
  { name: 'Pink', value: 'rgba(244, 114, 182, 0.4)' },
  { name: 'Orange', value: 'rgba(251, 146, 60, 0.4)' },
];

export const STROKE_WIDTHS = [
  { name: 'Thin', value: 1 },
  { name: 'Light', value: 2 },
  { name: 'Medium', value: 4 },
  { name: 'Bold', value: 6 },
  { name: 'Heavy', value: 10 },
];
