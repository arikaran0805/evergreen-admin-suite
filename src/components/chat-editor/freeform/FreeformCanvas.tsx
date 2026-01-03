import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Line, Textbox, PencilBrush, FabricObject } from "fabric";
import { FreeformCanvasToolbar } from "./FreeformCanvasToolbar";
import { FreeformTool, FreeformCanvasData, FREEFORM_COLORS, HIGHLIGHTER_COLORS } from "./types";
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
