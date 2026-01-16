/**
 * ViewAsRoleSelector - Admin-only UI to preview other role dashboards
 * 
 * Opens a dialog popup with role options when clicked.
 */
import { useState } from "react";
import { Eye, EyeOff, Shield, Users, UserCog, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth, getRoleDashboardPath, type AppRole } from "@/hooks/useAuth";
import { useViewAsRole } from "@/contexts/ViewAsRoleContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Available roles to view as (excluding admin since that's the actual role)
const VIEW_AS_ROLES: { role: AppRole; label: string; icon: typeof Shield; color: string }[] = [
  { role: "super_moderator", label: "Super Moderator", icon: Shield, color: "text-purple-600 dark:text-purple-400" },
  { role: "senior_moderator", label: "Senior Moderator", icon: UserCog, color: "text-blue-600 dark:text-blue-400" },
  { role: "moderator", label: "Moderator", icon: Users, color: "text-green-600 dark:text-green-400" },
  { role: "user", label: "User", icon: User, color: "text-gray-600 dark:text-gray-400" },
];

interface ViewAsRoleSelectorProps {
  isOpen?: boolean;
  onOpenDialog?: () => void;
}

const ViewAsRoleSelector = ({ isOpen = true, onOpenDialog }: ViewAsRoleSelectorProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { activeRole } = useAuth();
  const { viewAsRole, isViewingAs, startViewingAs, stopViewingAs } = useViewAsRole();
  const navigate = useNavigate();

  // Only show for actual admins
  if (activeRole !== "admin") {
    return null;
  }

  const handleViewAs = (role: AppRole) => {
    startViewingAs(role);
    setDialogOpen(false);
    // Navigate to that role's dashboard
    navigate(getRoleDashboardPath(role));
  };

  const handleExitViewAs = () => {
    stopViewingAs();
    setDialogOpen(false);
    // Return to admin dashboard
    navigate("/admin/dashboard");
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
    onOpenDialog?.();
  };

  const currentViewingLabel = VIEW_AS_ROLES.find(r => r.role === viewAsRole)?.label;
  const tooltipText = isViewingAs 
    ? `Viewing as: ${currentViewingLabel}` 
    : "View as Role";

  const triggerButton = (
    <button
      onClick={handleOpenDialog}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
        isViewingAs 
          ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20" 
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Eye className={cn("h-[18px] w-[18px] shrink-0", isViewingAs && "animate-pulse")} />
      {isOpen && (
        <span className="text-sm font-medium truncate">
          {isViewingAs ? `Viewing: ${currentViewingLabel}` : "View as Role"}
        </span>
      )}
    </button>
  );

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-muted-foreground" />
              View as Role
            </DialogTitle>
            <DialogDescription>
              Preview how other roles see their dashboard. Your actual permissions remain unchanged.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            {VIEW_AS_ROLES.map(({ role, label, icon: Icon, color }) => (
              <Button
                key={role}
                variant={viewAsRole === role ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-12 text-base",
                  viewAsRole === role && "bg-accent border border-border"
                )}
                onClick={() => handleViewAs(role)}
              >
                <Icon className={cn("h-5 w-5 mr-3", color)} />
                {label}
                {viewAsRole === role && (
                  <span className="ml-auto text-xs text-muted-foreground">Currently viewing</span>
                )}
              </Button>
            ))}
          </div>

          {isViewingAs && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleExitViewAs}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Exit View Mode
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sidebar trigger button - with tooltip when collapsed */}
      {!isOpen ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {triggerButton}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground border">
            <p className="font-medium">{tooltipText}</p>
            {isViewingAs && (
              <p className="text-xs text-muted-foreground">Click to change or exit</p>
            )}
          </TooltipContent>
        </Tooltip>
      ) : (
        triggerButton
      )}
    </>
  );
};

export default ViewAsRoleSelector;
