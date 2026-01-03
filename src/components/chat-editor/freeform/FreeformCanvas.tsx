import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Line, Textbox, PencilBrush, FabricObject, Group } from "fabric";
import { FreeformCanvasToolbar } from "./FreeformCanvasToolbar";
import { FreeformTool, FreeformCanvasData, FREEFORM_COLORS, HIGHLIGHTER_COLORS, TemplateId } from "./types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FreeformCanvasProps {
  initialData?: FreeformCanvasData;
  onSave: (data: FreeformCanvasData) => void;
  readOnly?: boolean;
  className?: string;
}

export const FreeformCanvas = ({
  initialData,
  onSave,
  readOnly = false,
  className,
}: FreeformCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<FreeformTool>("pen");
  const [activeColor, setActiveColor] = useState(FREEFORM_COLORS[0].value);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const isDrawingShape = useRef(false);
  const shapeStartPoint = useRef<{ x: number; y: number } | null>(null);
  const currentShape = useRef<FabricObject | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const width = initialData?.width || containerWidth || 800;
    const height = initialData?.height || 400;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "#ffffff",
      selection: !readOnly,
      isDrawingMode: false,
    });

    // Set up drawing brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = strokeWidth;

    // Load initial data if provided
    if (initialData?.canvasJson) {
      try {
        canvas.loadFromJSON(JSON.parse(initialData.canvasJson)).then(() => {
          canvas.renderAll();
        });
      } catch (e) {
        console.error("Failed to load canvas data:", e);
      }
    }

    setFabricCanvas(canvas);

    // Save initial state for undo
    const initialState = JSON.stringify(canvas.toJSON());
    setUndoStack([initialState]);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Update drawing mode based on active tool
  useEffect(() => {
    if (!fabricCanvas) return;

    const drawingTools = ['pen', 'pencil', 'highlighter'];
    fabricCanvas.isDrawingMode = drawingTools.includes(activeTool) && !readOnly;
    fabricCanvas.selection = activeTool === 'select';

    if (fabricCanvas.freeDrawingBrush) {
      if (activeTool === 'highlighter') {
        fabricCanvas.freeDrawingBrush.width = 20;
        fabricCanvas.freeDrawingBrush.color = HIGHLIGHTER_COLORS[0].value;
      } else if (activeTool === 'pencil') {
        fabricCanvas.freeDrawingBrush.width = 1;
        fabricCanvas.freeDrawingBrush.color = activeColor;
      } else {
        fabricCanvas.freeDrawingBrush.width = strokeWidth;
        fabricCanvas.freeDrawingBrush.color = activeColor;
      }
    }

    // Set up eraser behavior
    if (activeTool === 'eraser') {
      fabricCanvas.on('mouse:down', handleEraserStart);
      fabricCanvas.on('mouse:move', handleEraserMove);
    } else {
      fabricCanvas.off('mouse:down', handleEraserStart);
      fabricCanvas.off('mouse:move', handleEraserMove);
    }

    // Set up shape drawing
    const shapeTools = ['rectangle', 'circle', 'arrow', 'line'];
    if (shapeTools.includes(activeTool)) {
      fabricCanvas.on('mouse:down', handleShapeStart);
      fabricCanvas.on('mouse:move', handleShapeMove);
      fabricCanvas.on('mouse:up', handleShapeEnd);
    } else {
      fabricCanvas.off('mouse:down', handleShapeStart);
      fabricCanvas.off('mouse:move', handleShapeMove);
      fabricCanvas.off('mouse:up', handleShapeEnd);
    }

    // Set up text tool
    if (activeTool === 'text') {
      fabricCanvas.on('mouse:down', handleTextClick);
    } else {
      fabricCanvas.off('mouse:down', handleTextClick);
    }
  }, [activeTool, activeColor, strokeWidth, fabricCanvas, readOnly]);

  // Update brush color and width
  useEffect(() => {
    if (!fabricCanvas?.freeDrawingBrush) return;
    
    if (activeTool === 'highlighter') {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = 20;
    } else {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = strokeWidth;
    }
  }, [activeColor, strokeWidth, fabricCanvas, activeTool]);

  // Track changes for auto-save
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleObjectModified = () => {
      saveState();
      triggerAutoSave();
    };

    fabricCanvas.on('object:modified', handleObjectModified);
    fabricCanvas.on('path:created', handleObjectModified);
    fabricCanvas.on('object:added', handleObjectModified);

    return () => {
      fabricCanvas.off('object:modified', handleObjectModified);
      fabricCanvas.off('path:created', handleObjectModified);
      fabricCanvas.off('object:added', handleObjectModified);
    };
  }, [fabricCanvas]);

  const saveState = useCallback(() => {
    if (!fabricCanvas) return;
    const state = JSON.stringify(fabricCanvas.toJSON());
    setUndoStack(prev => [...prev.slice(-19), state]);
    setRedoStack([]);
  }, [fabricCanvas]);

  const triggerAutoSave = useCallback(() => {
    if (!fabricCanvas) return;
    const data: FreeformCanvasData = {
      canvasJson: JSON.stringify(fabricCanvas.toJSON()),
      width: fabricCanvas.width || 800,
      height: fabricCanvas.height || 400,
      version: 1,
    };
    onSave(data);
  }, [fabricCanvas, onSave]);

  // Eraser handlers
  const handleEraserStart = useCallback((e: any) => {
    if (!fabricCanvas || activeTool !== 'eraser') return;
    const target = fabricCanvas.findTarget(e.e);
    if (target) {
      fabricCanvas.remove(target);
      fabricCanvas.renderAll();
      saveState();
      triggerAutoSave();
    }
  }, [fabricCanvas, activeTool, saveState, triggerAutoSave]);

  const handleEraserMove = useCallback((e: any) => {
    if (!fabricCanvas || activeTool !== 'eraser' || !e.e.buttons) return;
    const target = fabricCanvas.findTarget(e.e);
    if (target) {
      fabricCanvas.remove(target);
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas, activeTool]);

  // Shape drawing handlers
  const handleShapeStart = useCallback((e: any) => {
    if (!fabricCanvas || !['rectangle', 'circle', 'arrow', 'line'].includes(activeTool)) return;
    
    const pointer = fabricCanvas.getPointer(e.e);
    isDrawingShape.current = true;
    shapeStartPoint.current = { x: pointer.x, y: pointer.y };

    let shape: FabricObject | null = null;

    if (activeTool === 'rectangle') {
      shape = new Rect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: 'transparent',
        stroke: activeColor,
        strokeWidth: strokeWidth,
      });
    } else if (activeTool === 'circle') {
      shape = new Circle({
        left: pointer.x,
        top: pointer.y,
        radius: 0,
        fill: 'transparent',
        stroke: activeColor,
        strokeWidth: strokeWidth,
      });
    } else if (activeTool === 'line' || activeTool === 'arrow') {
      shape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: activeColor,
        strokeWidth: strokeWidth,
      });
    }

    if (shape) {
      currentShape.current = shape;
      fabricCanvas.add(shape);
    }
  }, [fabricCanvas, activeTool, activeColor, strokeWidth]);

  const handleShapeMove = useCallback((e: any) => {
    if (!fabricCanvas || !isDrawingShape.current || !shapeStartPoint.current || !currentShape.current) return;

    const pointer = fabricCanvas.getPointer(e.e);
    const start = shapeStartPoint.current;

    if (activeTool === 'rectangle' && currentShape.current instanceof Rect) {
      const width = Math.abs(pointer.x - start.x);
      const height = Math.abs(pointer.y - start.y);
      currentShape.current.set({
        left: Math.min(start.x, pointer.x),
        top: Math.min(start.y, pointer.y),
        width,
        height,
      });
    } else if (activeTool === 'circle' && currentShape.current instanceof Circle) {
      const radius = Math.sqrt(Math.pow(pointer.x - start.x, 2) + Math.pow(pointer.y - start.y, 2)) / 2;
      currentShape.current.set({
        radius,
        left: (start.x + pointer.x) / 2 - radius,
        top: (start.y + pointer.y) / 2 - radius,
      });
    } else if ((activeTool === 'line' || activeTool === 'arrow') && currentShape.current instanceof Line) {
      currentShape.current.set({
        x2: pointer.x,
        y2: pointer.y,
      });
    }

    fabricCanvas.renderAll();
  }, [fabricCanvas, activeTool]);

  const handleShapeEnd = useCallback(() => {
    if (!fabricCanvas) return;
    
    isDrawingShape.current = false;
    shapeStartPoint.current = null;
    
    // Add arrowhead if arrow tool
    if (activeTool === 'arrow' && currentShape.current instanceof Line) {
      const line = currentShape.current;
      const x1 = line.x1 || 0;
      const y1 = line.y1 || 0;
      const x2 = line.x2 || 0;
      const y2 = line.y2 || 0;
      
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = 15;
      
      const arrowHead1 = new Line([
        x2,
        y2,
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6),
      ], {
        stroke: activeColor,
        strokeWidth: strokeWidth,
      });
      
      const arrowHead2 = new Line([
        x2,
        y2,
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6),
      ], {
        stroke: activeColor,
        strokeWidth: strokeWidth,
      });
      
      fabricCanvas.add(arrowHead1);
      fabricCanvas.add(arrowHead2);
    }
    
    currentShape.current = null;
    saveState();
    triggerAutoSave();
  }, [fabricCanvas, activeTool, activeColor, strokeWidth, saveState, triggerAutoSave]);

  // Text tool handler
  const handleTextClick = useCallback((e: any) => {
    if (!fabricCanvas || activeTool !== 'text') return;
    
    const pointer = fabricCanvas.getPointer(e.e);
    const text = new Textbox('Type here...', {
      left: pointer.x,
      top: pointer.y,
      fontSize: 16,
      fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
      fill: activeColor,
      width: 200,
      editable: true,
    });
    
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    
    saveState();
    triggerAutoSave();
  }, [fabricCanvas, activeTool, activeColor, saveState, triggerAutoSave]);

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    if (undoStack.length <= 1 || !fabricCanvas) return;
    
    const currentState = undoStack[undoStack.length - 1];
    const previousState = undoStack[undoStack.length - 2];
    
    setRedoStack(prev => [...prev, currentState]);
    setUndoStack(prev => prev.slice(0, -1));
    
    fabricCanvas.loadFromJSON(JSON.parse(previousState)).then(() => {
      fabricCanvas.renderAll();
      triggerAutoSave();
    });
  }, [undoStack, fabricCanvas, triggerAutoSave]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !fabricCanvas) return;
    
    const nextState = redoStack[redoStack.length - 1];
    
    setUndoStack(prev => [...prev, nextState]);
    setRedoStack(prev => prev.slice(0, -1));
    
    fabricCanvas.loadFromJSON(JSON.parse(nextState)).then(() => {
      fabricCanvas.renderAll();
      triggerAutoSave();
    });
  }, [redoStack, fabricCanvas, triggerAutoSave]);

  const handleClear = useCallback(() => {
    if (!fabricCanvas) return;
    saveState();
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    triggerAutoSave();
    toast.success("Canvas cleared");
  }, [fabricCanvas, saveState, triggerAutoSave]);

  const handleExport = useCallback(() => {
    if (!fabricCanvas) return;
    
    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });
    
    const link = document.createElement('a');
    link.download = 'visual-explanation.png';
    link.href = dataUrl;
    link.click();
    
    toast.success("Image exported");
  }, [fabricCanvas]);

  const handleZoomIn = useCallback(() => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom * 1.2, 3);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  }, [fabricCanvas, zoom]);

  const handleZoomOut = useCallback(() => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom / 1.2, 0.3);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  }, [fabricCanvas, zoom]);

  const handleToolChange = useCallback((tool: FreeformTool) => {
    setActiveTool(tool);
    if (tool === 'highlighter') {
      setActiveColor(HIGHLIGHTER_COLORS[0].value);
    } else if (activeColor.includes('rgba')) {
      setActiveColor(FREEFORM_COLORS[0].value);
    }
  }, [activeColor]);

  const handleInsertTemplate = useCallback((templateId: TemplateId) => {
    if (!fabricCanvas) return;

    const centerX = (fabricCanvas.width || 800) / 2 / zoom;
    const centerY = (fabricCanvas.height || 400) / 2 / zoom;

    switch (templateId) {
      case 'memory-box': {
        const box = new Rect({
          left: centerX - 60,
          top: centerY - 40,
          width: 120,
          height: 80,
          fill: '#f0f9ff',
          stroke: '#3b82f6',
          strokeWidth: 2,
          rx: 8,
          ry: 8,
        });
        const label = new Textbox('0x7fff', {
          left: centerX - 55,
          top: centerY - 35,
          fontSize: 10,
          fontFamily: 'ui-monospace, monospace',
          fill: '#64748b',
          width: 50,
        });
        const value = new Textbox('42', {
          left: centerX - 20,
          top: centerY - 10,
          fontSize: 24,
          fontFamily: 'ui-monospace, monospace',
          fill: '#1e293b',
          width: 80,
          textAlign: 'center',
        });
        fabricCanvas.add(box, label, value);
        break;
      }
      case 'variable-label': {
        const labelBg = new Rect({
          left: centerX - 50,
          top: centerY - 18,
          width: 100,
          height: 36,
          fill: '#fef3c7',
          stroke: '#f59e0b',
          strokeWidth: 2,
          rx: 6,
          ry: 6,
        });
        const varText = new Textbox('x = 10', {
          left: centerX - 40,
          top: centerY - 10,
          fontSize: 18,
          fontFamily: 'ui-monospace, monospace',
          fill: '#92400e',
          width: 80,
          textAlign: 'center',
        });
        fabricCanvas.add(labelBg, varText);
        break;
      }
      case 'pointer-arrow': {
        const arrowLine = new Line([centerX - 80, centerY, centerX + 60, centerY], {
          stroke: '#6366f1',
          strokeWidth: 3,
        });
        const arrowHead1 = new Line([centerX + 60, centerY, centerX + 45, centerY - 12], {
          stroke: '#6366f1',
          strokeWidth: 3,
        });
        const arrowHead2 = new Line([centerX + 60, centerY, centerX + 45, centerY + 12], {
          stroke: '#6366f1',
          strokeWidth: 3,
        });
        const pointerLabel = new Textbox('ptr', {
          left: centerX - 100,
          top: centerY - 25,
          fontSize: 14,
          fontFamily: 'ui-monospace, monospace',
          fill: '#4f46e5',
          width: 40,
        });
        fabricCanvas.add(arrowLine, arrowHead1, arrowHead2, pointerLabel);
        break;
      }
      case 'stack-frame': {
        const frame = new Rect({
          left: centerX - 80,
          top: centerY - 60,
          width: 160,
          height: 120,
          fill: '#f5f3ff',
          stroke: '#8b5cf6',
          strokeWidth: 2,
          rx: 4,
          ry: 4,
        });
        const header = new Rect({
          left: centerX - 80,
          top: centerY - 60,
          width: 160,
          height: 28,
          fill: '#8b5cf6',
          rx: 4,
          ry: 4,
        });
        const funcName = new Textbox('main()', {
          left: centerX - 70,
          top: centerY - 55,
          fontSize: 14,
          fontFamily: 'ui-monospace, monospace',
          fill: '#ffffff',
          width: 140,
        });
        const var1 = new Textbox('int x = 5', {
          left: centerX - 70,
          top: centerY - 20,
          fontSize: 12,
          fontFamily: 'ui-monospace, monospace',
          fill: '#4c1d95',
          width: 140,
        });
        const var2 = new Textbox('int y = 10', {
          left: centerX - 70,
          top: centerY + 5,
          fontSize: 12,
          fontFamily: 'ui-monospace, monospace',
          fill: '#4c1d95',
          width: 140,
        });
        fabricCanvas.add(frame, header, funcName, var1, var2);
        break;
      }
      case 'linked-node': {
        const nodeBox = new Rect({
          left: centerX - 60,
          top: centerY - 25,
          width: 80,
          height: 50,
          fill: '#ecfdf5',
          stroke: '#10b981',
          strokeWidth: 2,
          rx: 4,
          ry: 4,
        });
        const ptrBox = new Rect({
          left: centerX + 20,
          top: centerY - 25,
          width: 40,
          height: 50,
          fill: '#d1fae5',
          stroke: '#10b981',
          strokeWidth: 2,
          rx: 4,
          ry: 4,
        });
        const nodeValue = new Textbox('42', {
          left: centerX - 50,
          top: centerY - 12,
          fontSize: 20,
          fontFamily: 'ui-monospace, monospace',
          fill: '#065f46',
          width: 60,
          textAlign: 'center',
        });
        const ptrArrow = new Line([centerX + 60, centerY, centerX + 100, centerY], {
          stroke: '#10b981',
          strokeWidth: 2,
        });
        const ptrHead1 = new Line([centerX + 100, centerY, centerX + 88, centerY - 8], {
          stroke: '#10b981',
          strokeWidth: 2,
        });
        const ptrHead2 = new Line([centerX + 100, centerY, centerX + 88, centerY + 8], {
          stroke: '#10b981',
          strokeWidth: 2,
        });
        fabricCanvas.add(nodeBox, ptrBox, nodeValue, ptrArrow, ptrHead1, ptrHead2);
        break;
      }
      case 'array-cells': {
        const cellWidth = 50;
        const cellHeight = 40;
        const startX = centerX - (cellWidth * 2);
        for (let i = 0; i < 4; i++) {
          const cell = new Rect({
            left: startX + i * cellWidth,
            top: centerY - cellHeight / 2,
            width: cellWidth,
            height: cellHeight,
            fill: i === 0 ? '#dbeafe' : '#f8fafc',
            stroke: '#3b82f6',
            strokeWidth: 2,
          });
          const cellValue = new Textbox(String([10, 20, 30, 40][i]), {
            left: startX + i * cellWidth + 10,
            top: centerY - 10,
            fontSize: 16,
            fontFamily: 'ui-monospace, monospace',
            fill: '#1e40af',
            width: 30,
            textAlign: 'center',
          });
          const cellIndex = new Textbox(`[${i}]`, {
            left: startX + i * cellWidth + 12,
            top: centerY + cellHeight / 2 + 5,
            fontSize: 11,
            fontFamily: 'ui-monospace, monospace',
            fill: '#64748b',
            width: 26,
            textAlign: 'center',
          });
          fabricCanvas.add(cell, cellValue, cellIndex);
        }
        break;
      }
      case 'function-box': {
        const funcBox = new Rect({
          left: centerX - 70,
          top: centerY - 40,
          width: 140,
          height: 80,
          fill: '#fffbeb',
          stroke: '#f59e0b',
          strokeWidth: 2,
          rx: 8,
          ry: 8,
        });
        const funcLabel = new Textbox('function()', {
          left: centerX - 60,
          top: centerY - 30,
          fontSize: 14,
          fontFamily: 'ui-monospace, monospace',
          fill: '#b45309',
          width: 120,
          textAlign: 'center',
        });
        // Input arrow
        const inputArrow = new Line([centerX - 120, centerY, centerX - 70, centerY], {
          stroke: '#22c55e',
          strokeWidth: 2,
        });
        const inputHead1 = new Line([centerX - 70, centerY, centerX - 82, centerY - 8], {
          stroke: '#22c55e',
          strokeWidth: 2,
        });
        const inputHead2 = new Line([centerX - 70, centerY, centerX - 82, centerY + 8], {
          stroke: '#22c55e',
          strokeWidth: 2,
        });
        const inputLabel = new Textbox('input', {
          left: centerX - 140,
          top: centerY - 25,
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
          fill: '#16a34a',
          width: 40,
        });
        // Output arrow
        const outputArrow = new Line([centerX + 70, centerY, centerX + 120, centerY], {
          stroke: '#ef4444',
          strokeWidth: 2,
        });
        const outputHead1 = new Line([centerX + 120, centerY, centerX + 108, centerY - 8], {
          stroke: '#ef4444',
          strokeWidth: 2,
        });
        const outputHead2 = new Line([centerX + 120, centerY, centerX + 108, centerY + 8], {
          stroke: '#ef4444',
          strokeWidth: 2,
        });
        const outputLabel = new Textbox('output', {
          left: centerX + 105,
          top: centerY - 25,
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
          fill: '#dc2626',
          width: 45,
        });
        fabricCanvas.add(funcBox, funcLabel, inputArrow, inputHead1, inputHead2, inputLabel, outputArrow, outputHead1, outputHead2, outputLabel);
        break;
      }
      case 'binary-tree-node': {
        // Root node
        const rootNode = new Circle({
          left: centerX - 25,
          top: centerY - 80,
          radius: 25,
          fill: '#fef3c7',
          stroke: '#f59e0b',
          strokeWidth: 2,
        });
        const rootValue = new Textbox('50', {
          left: centerX - 15,
          top: centerY - 70,
          fontSize: 16,
          fontFamily: 'ui-monospace, monospace',
          fill: '#92400e',
          width: 30,
          textAlign: 'center',
        });
        // Left child
        const leftNode = new Circle({
          left: centerX - 85,
          top: centerY,
          radius: 22,
          fill: '#dbeafe',
          stroke: '#3b82f6',
          strokeWidth: 2,
        });
        const leftValue = new Textbox('25', {
          left: centerX - 77,
          top: centerY + 8,
          fontSize: 14,
          fontFamily: 'ui-monospace, monospace',
          fill: '#1e40af',
          width: 26,
          textAlign: 'center',
        });
        // Right child
        const rightNode = new Circle({
          left: centerX + 40,
          top: centerY,
          radius: 22,
          fill: '#dbeafe',
          stroke: '#3b82f6',
          strokeWidth: 2,
        });
        const rightValue = new Textbox('75', {
          left: centerX + 48,
          top: centerY + 8,
          fontSize: 14,
          fontFamily: 'ui-monospace, monospace',
          fill: '#1e40af',
          width: 26,
          textAlign: 'center',
        });
        // Left edge
        const leftEdge = new Line([centerX - 15, centerY - 55, centerX - 55, centerY + 5], {
          stroke: '#94a3b8',
          strokeWidth: 2,
        });
        // Right edge
        const rightEdge = new Line([centerX + 15, centerY - 55, centerX + 55, centerY + 5], {
          stroke: '#94a3b8',
          strokeWidth: 2,
        });
        fabricCanvas.add(leftEdge, rightEdge, rootNode, rootValue, leftNode, leftValue, rightNode, rightValue);
        break;
      }
      case 'hash-table': {
        const bucketWidth = 120;
        const bucketHeight = 32;
        const startY = centerY - 60;
        const buckets = [
          { index: 0, key: '"apple"', value: '5' },
          { index: 1, key: null, value: null },
          { index: 2, key: '"banana"', value: '3' },
          { index: 3, key: '"cherry"', value: '8' },
        ];
        buckets.forEach((bucket, i) => {
          // Index box
          const indexBox = new Rect({
            left: centerX - 90,
            top: startY + i * (bucketHeight + 4),
            width: 30,
            height: bucketHeight,
            fill: '#e0e7ff',
            stroke: '#6366f1',
            strokeWidth: 1.5,
          });
          const indexText = new Textbox(`[${bucket.index}]`, {
            left: centerX - 85,
            top: startY + i * (bucketHeight + 4) + 8,
            fontSize: 12,
            fontFamily: 'ui-monospace, monospace',
            fill: '#4338ca',
            width: 24,
            textAlign: 'center',
          });
          // Bucket box
          const bucketBox = new Rect({
            left: centerX - 60,
            top: startY + i * (bucketHeight + 4),
            width: bucketWidth,
            height: bucketHeight,
            fill: bucket.key ? '#f0fdf4' : '#f8fafc',
            stroke: bucket.key ? '#22c55e' : '#cbd5e1',
            strokeWidth: 1.5,
          });
          fabricCanvas.add(indexBox, indexText, bucketBox);
          if (bucket.key) {
            const keyText = new Textbox(`${bucket.key}: ${bucket.value}`, {
              left: centerX - 50,
              top: startY + i * (bucketHeight + 4) + 8,
              fontSize: 12,
              fontFamily: 'ui-monospace, monospace',
              fill: '#166534',
              width: 100,
            });
            fabricCanvas.add(keyText);
          } else {
            const emptyText = new Textbox('empty', {
              left: centerX - 35,
              top: startY + i * (bucketHeight + 4) + 8,
              fontSize: 11,
              fontFamily: 'ui-monospace, monospace',
              fill: '#94a3b8',
              width: 50,
              fontStyle: 'italic',
            });
            fabricCanvas.add(emptyText);
          }
        });
        // Title
        const hashTitle = new Textbox('Hash Table', {
          left: centerX - 50,
          top: startY - 28,
          fontSize: 13,
          fontFamily: 'ui-monospace, monospace',
          fill: '#4338ca',
          width: 100,
          textAlign: 'center',
          fontWeight: 'bold',
        });
        fabricCanvas.add(hashTitle);
        break;
      }
      case 'loop-iteration': {
        const loopWidth = 180;
        const loopHeight = 100;
        // Loop container
        const loopBox = new Rect({
          left: centerX - loopWidth / 2,
          top: centerY - loopHeight / 2,
          width: loopWidth,
          height: loopHeight,
          fill: '#fef3c7',
          stroke: '#f59e0b',
          strokeWidth: 2,
          rx: 12,
          ry: 12,
        });
        // Loop label
        const loopLabel = new Textbox('for i in range(3):', {
          left: centerX - loopWidth / 2 + 10,
          top: centerY - loopHeight / 2 + 8,
          fontSize: 12,
          fontFamily: 'ui-monospace, monospace',
          fill: '#92400e',
          width: loopWidth - 20,
        });
        // Iteration boxes
        const iterations = [0, 1, 2];
        iterations.forEach((iter, idx) => {
          const iterBox = new Rect({
            left: centerX - 70 + idx * 50,
            top: centerY - 5,
            width: 40,
            height: 36,
            fill: idx === 1 ? '#22c55e' : '#ffffff',
            stroke: idx === 1 ? '#16a34a' : '#d1d5db',
            strokeWidth: idx === 1 ? 2 : 1,
            rx: 6,
            ry: 6,
          });
          const iterText = new Textbox(`i=${iter}`, {
            left: centerX - 65 + idx * 50,
            top: centerY + 5,
            fontSize: 12,
            fontFamily: 'ui-monospace, monospace',
            fill: idx === 1 ? '#ffffff' : '#6b7280',
            width: 36,
            textAlign: 'center',
          });
          fabricCanvas.add(iterBox, iterText);
        });
        // Current arrow
        const currentArrow = new Textbox('▲', {
          left: centerX - 20,
          top: centerY + 35,
          fontSize: 16,
          fill: '#22c55e',
          width: 20,
          textAlign: 'center',
        });
        const currentLabel = new Textbox('current', {
          left: centerX - 30,
          top: centerY + 52,
          fontSize: 10,
          fontFamily: 'ui-monospace, monospace',
          fill: '#16a34a',
          width: 40,
          textAlign: 'center',
        });
        fabricCanvas.add(loopBox, loopLabel, currentArrow, currentLabel);
        break;
      }
    }

    fabricCanvas.renderAll();
    saveState();
    triggerAutoSave();
    setActiveTool('select');
    toast.success('Template added');
  }, [fabricCanvas, zoom, saveState, triggerAutoSave]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-background shadow-lg overflow-hidden",
        className
      )}
    >
      {!readOnly && (
        <FreeformCanvasToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          activeColor={activeColor}
          onColorChange={setActiveColor}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onExport={handleExport}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onInsertTemplate={handleInsertTemplate}
          canUndo={undoStack.length > 1}
          canRedo={redoStack.length > 0}
          zoom={zoom}
        />
      )}
      
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-auto bg-white",
          readOnly ? "cursor-default" : "cursor-crosshair"
        )}
        style={{
          backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
};
