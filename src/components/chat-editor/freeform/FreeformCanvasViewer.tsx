import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas } from "fabric";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { FreeformCanvasData } from "./types";

interface FreeformCanvasViewerProps {
  data: FreeformCanvasData;
  className?: string;
}

export const FreeformCanvasViewer = ({
  data,
  className,
}: FreeformCanvasViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });

  const baseWidth = data.width || 800;
  const baseHeight = data.height || 400;

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: baseWidth,
      height: baseHeight,
      backgroundColor: "#ffffff",
      selection: false,
      interactive: false,
    });

    // Load canvas data
    if (data.canvasJson) {
      try {
        canvas.loadFromJSON(JSON.parse(data.canvasJson)).then(() => {
          // Make all objects non-interactive
          canvas.getObjects().forEach((obj) => {
            obj.set({
              selectable: false,
              evented: false,
              hasControls: false,
              hasBorders: false,
            });
          });
          canvas.renderAll();
        });
      } catch (e) {
        console.error("Failed to load canvas data:", e);
      }
    }

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [data.canvasJson, baseWidth, baseHeight]);

  // Fit the canvas to the container width (prevents it from forcing the layout / shrinking sidebars)
  useEffect(() => {
    if (!fabricCanvas || !containerRef.current) return;

    const el = containerRef.current;
    const aspect = baseHeight / baseWidth;

    const applySize = () => {
      const available = el.clientWidth;
      if (!available) return;
      const displayWidth = Math.min(available, baseWidth);
      const displayHeight = Math.max(180, Math.round(displayWidth * aspect));
      fabricCanvas.setDimensions({ width: displayWidth, height: displayHeight }, { cssOnly: true });
      fabricCanvas.renderAll();
    };

    applySize();

    const resizeObserverSupported = typeof ResizeObserver !== "undefined";

    if (resizeObserverSupported) {
      const ro = new ResizeObserver(() => applySize());
      ro.observe(el);
      return () => ro.disconnect();
    }

    const onResize = () => applySize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fabricCanvas, baseWidth, baseHeight]);

  // Handle panning
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left click for pan
        isPanning.current = true;
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
        container.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return;
      
      const deltaX = e.clientX - lastPanPoint.current.x;
      const deltaY = e.clientY - lastPanPoint.current.y;
      
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isPanning.current = false;
      container.style.cursor = 'grab';
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.min(Math.max(prev + delta, 0.3), 3));
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleReset = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-background shadow-md overflow-hidden group",
        "w-full max-w-full",
        className
      )}
    >
      {/* Zoom controls - visible on hover */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-border/50">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleZoomOut}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleZoomIn}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Canvas container with pan/zoom */}
      <div
        ref={containerRef}
        className="overflow-hidden cursor-grab"
        style={{
          backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning.current ? 'none' : 'transform 0.1s ease-out',
            maxWidth: '100%',
          }}
        >
          <canvas
            ref={canvasRef}
            className="block max-w-full"
            style={{ width: '100%', height: 'auto', maxWidth: '100%' }}
          />
        </div>
      </div>

      {/* Visual explanation label */}
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-xs text-muted-foreground border border-border/50">
        Visual Explanation
      </div>
    </div>
  );
};
