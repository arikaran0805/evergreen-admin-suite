/**
 * ViewAsRoleSelector - Admin-only UI to preview other role dashboards
 * 
 * Displays in admin sidebar and allows quick switching between role views.
 */
import { Eye, EyeOff, Shield, Users, UserCog, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth, getRoleDashboardPath, type AppRole } from "@/hooks/useAuth";
import { useViewAsRole } from "@/contexts/ViewAsRoleContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Available roles to view as (excluding admin since that's the actual role)
const VIEW_AS_ROLES: { role: AppRole; label: string; icon: typeof Shield }[] = [
  { role: "super_moderator", label: "Super Moderator", icon: Shield },
  { role: "senior_moderator", label: "Senior Moderator", icon: UserCog },
  { role: "moderator", label: "Moderator", icon: Users },
  { role: "user", label: "User", icon: User },
];

interface ViewAsRoleSelectorProps {
  isOpen?: boolean;
}

const ViewAsRoleSelector = ({ isOpen = true }: ViewAsRoleSelectorProps) => {
  const { activeRole } = useAuth();
  const { viewAsRole, isViewingAs, startViewingAs, stopViewingAs } = useViewAsRole();
  const navigate = useNavigate();

  // Only show for actual admins
  if (activeRole !== "admin") {
    return null;
  }

  const handleViewAs = (role: AppRole) => {
    startViewingAs(role);
    // Navigate to that role's dashboard
    navigate(getRoleDashboardPath(role));
  };

  const handleExitViewAs = () => {
    stopViewingAs();
    // Return to admin dashboard
    navigate("/admin/dashboard");
  };

  if (!isOpen) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              isViewingAs && "text-amber-500 bg-amber-500/10"
            )}
          >
            {isViewingAs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>View as Role</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {VIEW_AS_ROLES.map(({ role, label, icon: Icon }) => (
            <DropdownMenuItem
              key={role}
              onClick={() => handleViewAs(role)}
              className={cn(viewAsRole === role && "bg-accent")}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </DropdownMenuItem>
          ))}
          {isViewingAs && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExitViewAs} className="text-destructive">
                <EyeOff className="h-4 w-4 mr-2" />
                Exit View Mode
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <Eye className="h-3 w-3" />
        View as Role
      </div>
      <div className="space-y-1">
        {VIEW_AS_ROLES.map(({ role, label, icon: Icon }) => (
          <Button
            key={role}
            variant={viewAsRole === role ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "w-full justify-start text-xs h-7",
              viewAsRole === role && "bg-accent"
            )}
            onClick={() => handleViewAs(role)}
          >
            <Icon className="h-3 w-3 mr-2" />
            {label}
          </Button>
        ))}
        {isViewingAs && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-7 text-destructive hover:text-destructive"
            onClick={handleExitViewAs}
          >
            <EyeOff className="h-3 w-3 mr-2" />
            Exit View Mode
          </Button>
        )}
      </div>
    </div>
  );
};

export default ViewAsRoleSelector;
