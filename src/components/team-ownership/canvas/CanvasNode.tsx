import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CanvasNodeProps {
  type: "career" | "super_moderator" | "course" | "senior_moderator" | "moderator";
  title: string;
  badge?: string;
  icon?: ReactNode;
  color?: string;
  children?: ReactNode;
  className?: string;
  isDropZone?: boolean;
  isDragOver?: boolean;
  onDoubleClick?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
}

const nodeStyles = {
  career: "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30",
  super_moderator: "bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30",
  course: "bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30",
  senior_moderator: "bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30",
  moderator: "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30",
};

const badgeStyles = {
  career: "bg-primary/20 text-primary border-primary/30",
  super_moderator: "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30",
  course: "bg-accent/20 text-accent-foreground border-accent/30",
  senior_moderator: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  moderator: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

const CanvasNode = ({
  type,
  title,
  badge,
  icon,
  color,
  children,
  className,
  isDropZone,
  isDragOver,
  onDoubleClick,
  onDrop,
  onDragOver,
  onDragLeave,
}: CanvasNodeProps) => {
  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 transition-all",
        nodeStyles[type],
        isDragOver && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isDropZone && "border-dashed cursor-pointer hover:border-primary/50",
        className
      )}
      onDoubleClick={onDoubleClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="flex items-center gap-3 mb-3">
        {icon && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold shadow-md"
            style={{ backgroundColor: color || "hsl(var(--primary))" }}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">{title}</h4>
          {badge && (
            <Badge variant="outline" className={cn("mt-1 text-[10px] h-5", badgeStyles[type])}>
              {badge}
            </Badge>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

export default CanvasNode;
