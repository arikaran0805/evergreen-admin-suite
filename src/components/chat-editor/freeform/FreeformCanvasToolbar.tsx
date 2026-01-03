import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  MousePointer2,
  Pencil,
  PenTool,
  Highlighter,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  ZoomIn,
  ZoomOut,
  Shapes,
  Box,
  Tag,
  Layers,
  GitBranch,
  Table,
  Code,
  Network,
  Hash,
  Repeat,
  Group,
  Ungroup,
} from "lucide-react";
import { FreeformTool, FREEFORM_COLORS, HIGHLIGHTER_COLORS, STROKE_WIDTHS, SHAPE_TEMPLATES, TemplateId } from "./types";

interface FreeformCanvasToolbarProps {
  activeTool: FreeformTool;
  onToolChange: (tool: FreeformTool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onInsertTemplate: (templateId: TemplateId) => void;
  onGroup: () => void;
  onUngroup: () => void;
  canGroup: boolean;
  canUngroup: boolean;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
}

const templateIcons: Record<string, React.ElementType> = {
  'box': Box,
  'tag': Tag,
  'arrow-right': ArrowRight,
  'layers': Layers,
  'git-branch': GitBranch,
  'table': Table,
  'code': Code,
  'network': Network,
  'hash': Hash,
  'repeat': Repeat,
};

const ToolButton = ({
  tool,
  activeTool,
  onToolChange,
  icon: Icon,
  label,
}: {
  tool: FreeformTool;
  activeTool: FreeformTool;
  onToolChange: (tool: FreeformTool) => void;
  icon: React.ElementType;
  label: string;
}) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={activeTool === tool ? "default" : "ghost"}
          size="icon"
          className={cn(
            "h-8 w-8 rounded-lg transition-all",
            activeTool === tool && "bg-primary text-primary-foreground shadow-sm"
          )}
          onClick={() => onToolChange(tool)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-popover text-popover-foreground border shadow-md">
        <p className="text-xs">{label}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const FreeformCanvasToolbar = ({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
  onExport,
  onZoomIn,
  onZoomOut,
  onInsertTemplate,
  onGroup,
  onUngroup,
  canGroup,
  canUngroup,
  canUndo,
  canRedo,
  zoom,
}: FreeformCanvasToolbarProps) => {
  const isHighlighter = activeTool === 'highlighter';
  const colors = isHighlighter ? HIGHLIGHTER_COLORS : FREEFORM_COLORS;

  const groupedTemplates = {
    memory: SHAPE_TEMPLATES.filter(t => t.category === 'memory'),
    'data-structures': SHAPE_TEMPLATES.filter(t => t.category === 'data-structures'),
    flow: SHAPE_TEMPLATES.filter(t => t.category === 'flow'),
  };

  return (
    <div className="flex items-center gap-1 p-2 bg-background/95 backdrop-blur-sm border-b border-border rounded-t-xl flex-wrap">
      {/* Selection & Drawing Tools */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-border/50">
        <ToolButton tool="select" activeTool={activeTool} onToolChange={onToolChange} icon={MousePointer2} label="Select" />
        <ToolButton tool="pen" activeTool={activeTool} onToolChange={onToolChange} icon={PenTool} label="Pen" />
        <ToolButton tool="pencil" activeTool={activeTool} onToolChange={onToolChange} icon={Pencil} label="Pencil" />
        <ToolButton tool="highlighter" activeTool={activeTool} onToolChange={onToolChange} icon={Highlighter} label="Highlighter" />
      </div>

      {/* Shape Tools */}
      <div className="flex items-center gap-0.5 px-2 border-r border-border/50">
        <ToolButton tool="rectangle" activeTool={activeTool} onToolChange={onToolChange} icon={Square} label="Rectangle" />
        <ToolButton tool="circle" activeTool={activeTool} onToolChange={onToolChange} icon={Circle} label="Circle" />
        <ToolButton tool="arrow" activeTool={activeTool} onToolChange={onToolChange} icon={ArrowRight} label="Arrow" />
        <ToolButton tool="line" activeTool={activeTool} onToolChange={onToolChange} icon={Minus} label="Line" />
      </div>

      {/* Templates */}
      <div className="px-2 border-r border-border/50">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 rounded-lg gap-1.5">
              <Shapes className="h-4 w-4" />
              <span className="text-xs">Templates</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 bg-popover border shadow-lg z-50" align="start">
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Memory</h4>
                <div className="grid gap-1">
                  {groupedTemplates.memory.map((template) => {
                    const Icon = templateIcons[template.icon] || Box;
                    return (
                      <button
                        key={template.id}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted transition-colors text-left w-full"
                        onClick={() => onInsertTemplate(template.id)}
                      >
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Data Structures</h4>
                <div className="grid gap-1">
                  {groupedTemplates['data-structures'].map((template) => {
                    const Icon = templateIcons[template.icon] || Box;
                    return (
                      <button
                        key={template.id}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted transition-colors text-left w-full"
                        onClick={() => onInsertTemplate(template.id)}
                      >
                        <Icon className="h-4 w-4 text-green-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Flow</h4>
                <div className="grid gap-1">
                  {groupedTemplates.flow.map((template) => {
                    const Icon = templateIcons[template.icon] || Box;
                    return (
                      <button
                        key={template.id}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted transition-colors text-left w-full"
                        onClick={() => onInsertTemplate(template.id)}
                      >
                        <Icon className="h-4 w-4 text-amber-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Text & Eraser */}
      <div className="flex items-center gap-0.5 px-2 border-r border-border/50">
        <ToolButton tool="text" activeTool={activeTool} onToolChange={onToolChange} icon={Type} label="Text" />
        <ToolButton tool="eraser" activeTool={activeTool} onToolChange={onToolChange} icon={Eraser} label="Eraser" />
      </div>

      {/* Group/Ungroup */}
      <div className="flex items-center gap-0.5 px-2 border-r border-border/50">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={onGroup}
                disabled={!canGroup}
              >
                <Group className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-popover text-popover-foreground border shadow-md">
              <p className="text-xs">Group Selected</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={onUngroup}
                disabled={!canUngroup}
              >
                <Ungroup className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-popover text-popover-foreground border shadow-md">
              <p className="text-xs">Ungroup Selected</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Color Picker */}
      <div className="px-2 border-r border-border/50">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <div
                className="h-5 w-5 rounded-full border-2 border-border shadow-inner"
                style={{ backgroundColor: activeColor }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 bg-popover border shadow-lg z-50" align="center">
            <div className="grid grid-cols-6 gap-1.5">
              {colors.map((color) => (
                <button
                  key={color.value}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                    activeColor === color.value ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                  )}
                  style={{ backgroundColor: color.value }}
                  onClick={() => onColorChange(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Stroke Width */}
      <div className="px-2 border-r border-border/50">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 rounded-lg gap-1.5 text-xs">
              <div className="flex items-center gap-1">
                <div
                  className="rounded-full bg-foreground"
                  style={{ width: Math.min(strokeWidth * 2, 16), height: Math.min(strokeWidth * 2, 16) }}
                />
                <span className="text-muted-foreground">{strokeWidth}px</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 bg-popover border shadow-lg z-50" align="center">
            <div className="flex flex-col gap-1">
              {STROKE_WIDTHS.map((width) => (
                <button
                  key={width.value}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-muted transition-colors",
                    strokeWidth === width.value && "bg-muted"
                  )}
                  onClick={() => onStrokeWidthChange(width.value)}
                >
                  <div
                    className="rounded-full bg-foreground"
                    style={{ width: width.value * 2, height: width.value * 2 }}
                  />
                  <span className="text-sm">{width.name}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5 px-2 border-r border-border/50">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-popover text-popover-foreground border shadow-md">
              <p className="text-xs">Undo</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={onRedo}
                disabled={!canRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-popover text-popover-foreground border shadow-md">
              <p className="text-xs">Redo</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5 px-2 border-r border-border/50">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={onZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-popover text-popover-foreground border shadow-md">
              <p className="text-xs">Zoom Out</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={onZoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-popover text-popover-foreground border shadow-md">
              <p className="text-xs">Zoom In</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 pl-2">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={onExport}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-popover text-popover-foreground border shadow-md">
              <p className="text-xs">Export as Image</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                onClick={onClear}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-popover text-popover-foreground border shadow-md">
              <p className="text-xs">Clear Canvas</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
