/**
 * SeniorModeratorSidebar - Senior Moderator Role Sidebar
 * INDEPENDENT implementation - does NOT use shared RoleSidebar
 * Imports ONLY seniorModerator.sidebar.ts configuration
 * 
 * Power-Level Color: Amber #D97706
 */
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, LogOut, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { seniorModeratorSidebarConfig } from "@/sidebar/seniorModerator.sidebar";
import RoleNotificationBell from "@/components/RoleNotificationBell";

interface SeniorModeratorSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userProfile: { full_name: string | null; avatar_url: string | null } | null;
  userId: string | null;
  getBadgeCount?: (key: string) => number | undefined;
}

const SeniorModeratorSidebar = ({
  isOpen,
  onToggle,
  userProfile,
  userId,
  getBadgeCount,
}: SeniorModeratorSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { sections, roleLabel, roleColor } = seniorModeratorSidebarConfig;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Logged out successfully" });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error logging out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => {
    const dashboardPath = "/senior-moderator/dashboard";
    if (path === dashboardPath) {
      return location.pathname === dashboardPath || location.pathname === "/senior-moderator";
    }
    return location.pathname.startsWith(path);
  };

  const getItemBadge = (path: string): number | undefined => {
    const pathKey = path.split('/').pop() || '';
    return getBadgeCount ? getBadgeCount(pathKey) : undefined;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 flex flex-col",
        isOpen ? "w-64" : "w-[68px]"
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border">
        <div
          className={cn(
            "flex items-center bg-muted/50 rounded-lg p-2 cursor-pointer hover:bg-muted/70 transition-colors",
            isOpen ? "justify-between" : "justify-center"
          )}
          onClick={onToggle}
        >
          {isOpen && (
            <div className="flex items-center gap-3">
              <Avatar className={cn("shrink-0 ring-2 h-9 w-9", roleColor.avatarRing)}>
                <AvatarImage
                  src={userProfile?.avatar_url || undefined}
                  alt={userProfile?.full_name || "Senior Moderator"}
                />
                <AvatarFallback className={cn("font-semibold text-xs", roleColor.avatarBg, roleColor.avatarText)}>
                  {userProfile?.full_name?.charAt(0)?.toUpperCase() || "S"}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sidebar-foreground text-sm">
                {userProfile?.full_name || "Senior Moderator"}
              </span>
            </div>
          )}
          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-background shadow-sm border border-border">
            {isOpen ? (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        {isOpen && (
          <div className="flex items-center justify-between mt-2 px-1">
            <Badge
              className={cn("text-[10px] px-2 py-0 font-medium", roleColor.badgeBg, roleColor.badge, roleColor.badgeBorder)}
              variant="outline"
            >
              {roleLabel}
            </Badge>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                onClick={() => {
                  const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                  document.dispatchEvent(event);
                }}
              >
                <Search className="h-4 w-4" />
              </Button>
              <RoleNotificationBell />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {sections.map((section, sectionIndex) => (
            <div key={section.title} className={cn(sectionIndex > 0 && "mt-6")}>
              {isOpen && (
                <div className="px-3 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {section.title}
                  </span>
                </div>
              )}
              {!isOpen && sectionIndex > 0 && (
                <Separator className="mx-2 mb-2 bg-sidebar-border/50" />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.path);
                  const badge = getItemBadge(item.path);

                  return (
                    <Link key={item.path} to={item.path}>
                      <div
                        className={cn(
                          "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                          active
                            ? cn(roleColor.activeBackground, "text-white shadow-sm")
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            active ? roleColor.iconActive : "text-muted-foreground group-hover:text-sidebar-foreground"
                          )}
                        />
                        {isOpen && (
                          <>
                            <span
                              className={cn(
                                "flex-1 text-sm font-medium truncate",
                                active ? "text-white" : ""
                              )}
                            >
                              {item.label}
                            </span>
                            {badge && badge > 0 && (
                              <Badge
                                variant="destructive"
                                className="h-5 min-w-5 px-1.5 text-[10px] font-semibold"
                              >
                                {badge}
                              </Badge>
                            )}
                          </>
                        )}
                        {!isOpen && badge && badge > 0 && (
                          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border mt-auto">
        <Link to="/">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-all duration-200">
            <Home className="h-[18px] w-[18px]" />
            {isOpen && <span className="text-sm font-medium">Back to Site</span>}
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-all duration-200"
        >
          <LogOut className="h-[18px] w-[18px]" />
          {isOpen && <span className="text-sm font-medium">Logout</span>}
        </button>

        {!isOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full h-9 mt-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </aside>
  );
};

export default SeniorModeratorSidebar;
