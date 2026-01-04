import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas } from "fabric";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Expand, Maximize2 } from "lucide-react";
import { FreeformCanvasData } from "./types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [containerHeight, setContainerHeight] = useState(300);

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

  // Fit the canvas to the container width
  useEffect(() => {
    if (!fabricCanvas || !containerRef.current) return;

    const el = containerRef.current;

    const applySize = () => {
      const available = el.clientWidth;
      if (!available) return;
      
      // Apply zoom to dimensions
      const displayWidth = Math.min(available, baseWidth * zoom);
      const aspect = baseHeight / baseWidth;
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
  }, [fabricCanvas, baseWidth, baseHeight, zoom]);

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const handleReset = () => {
    setZoom(1);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setContainerHeight(isExpanded ? 300 : 500);
  };

  const zoomOptions = [
    { label: "50%", value: 0.5 },
    { label: "75%", value: 0.75 },
    { label: "100%", value: 1 },
    { label: "125%", value: 1.25 },
    { label: "150%", value: 1.5 },
    { label: "200%", value: 2 },
  ];

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-background shadow-md overflow-hidden group",
        "w-full max-w-full",
        isExpanded && "ring-2 ring-primary/20",
        className
      )}
    >
      {/* Controls bar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-border/50">
        {/* Zoom lens button with popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1.5"
            >
              <ZoomIn className="h-3.5 w-3.5" />
              <span className="text-xs">{Math.round(zoom * 100)}%</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-2" align="end">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">Zoom Level</p>
              {zoomOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={zoom === option.value ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start h-8 text-xs"
                  onClick={() => handleZoomChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
              <div className="border-t border-border my-1" />
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-8 text-xs"
                onClick={handleReset}
              >
                <RotateCcw className="h-3 w-3 mr-1.5" />
                Reset
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-4 bg-border mx-1" />
        
        {/* Expand/collapse button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggleExpanded}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <Maximize2 className="h-3.5 w-3.5" />
          ) : (
            <Expand className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Canvas container - no drag zoom, fixed at selected zoom level */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--muted)) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          height: isExpanded ? containerHeight : 'auto',
          minHeight: 200,
          maxHeight: isExpanded ? containerHeight : 400,
          transition: 'height 0.3s ease, max-height 0.3s ease',
        }}
      >
        <div
          className="flex items-center justify-center p-4"
          style={{
            minWidth: 'fit-content',
          }}
        >
          <canvas
            ref={canvasRef}
            className="block"
            style={{ 
              maxWidth: '100%', 
              height: 'auto',
            }}
          />
        </div>
      </div>

      {/* Resize handle when expanded */}
      {isExpanded && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-gradient-to-t from-muted/50 to-transparent hover:from-primary/20 transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            const startY = e.clientY;
            const startHeight = containerHeight;
            
            const handleMouseMove = (moveE: MouseEvent) => {
              const deltaY = moveE.clientY - startY;
              setContainerHeight(Math.max(200, Math.min(800, startHeight + deltaY)));
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
      )}

      {/* Visual explanation label */}
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-xs text-muted-foreground border border-border/50">
        Visual Explanation
      </div>
    </div>
  );
};
