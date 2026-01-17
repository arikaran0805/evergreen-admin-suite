import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X, Star } from "lucide-react";
import type { UserProfile } from "../types";

interface CanvasUserChipProps {
  user: UserProfile;
  isDefaultManager?: boolean;
  showDefaultAction?: boolean;
  onRemove?: () => void;
  onSetDefault?: () => void;
  variant?: "super_moderator" | "senior_moderator" | "moderator";
}

const variantStyles = {
  super_moderator: "bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50",
  senior_moderator: "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50",
  moderator: "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50",
};

const CanvasUserChip = ({
  user,
  isDefaultManager,
  showDefaultAction,
  onRemove,
  onSetDefault,
  variant = "moderator",
}: CanvasUserChipProps) => {
  return (
    <div
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${variantStyles[variant]}`}
    >
      <Avatar className="h-6 w-6">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback className="text-xs bg-muted">
          {user.full_name?.[0] || user.email[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {user.full_name || user.email.split("@")[0]}
        </p>
      </div>
      {isDefaultManager && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5">
          <Star className="h-2.5 w-2.5 fill-current" />
          Default
        </Badge>
      )}

      {/* Action buttons */}
      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {showDefaultAction && !isDefaultManager && onSetDefault && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetDefault();
            }}
            className="p-1 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 transition-transform"
            title="Set as default manager"
          >
            <Star className="h-3 w-3" />
          </button>
        )}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded-full bg-destructive text-destructive-foreground shadow-md hover:scale-110 transition-transform"
            title="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CanvasUserChip;
