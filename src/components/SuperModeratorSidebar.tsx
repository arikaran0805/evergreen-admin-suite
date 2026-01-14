import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { superModeratorSidebarConfig } from "@/sidebar/superModerator.sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SuperModeratorSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userProfile?: {
    full_name?: string | null;
    email?: string;
    avatar_url?: string | null;
  } | null;
  userId?: string | null;
  getBadgeCount?: (path: string) => number;
}

const SuperModeratorSidebar = ({
  isOpen,
  onToggle,
  userProfile,
  userId,
  getBadgeCount,
}: SuperModeratorSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const getItemBadge = (path: string) => {
    if (getBadgeCount) {
      const count = getBadgeCount(path);
      return count > 0 ? count : undefined;
    }
    return undefined;
  };

  const { sections, roleLabel, roleColor } = superModeratorSidebarConfig;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col",
        isOpen ? "w-64" : "w-16"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {isOpen && (
          <div className="flex items-center gap-3">
            <Avatar className={cn("h-8 w-8", roleColor.avatarRing, "ring-2")}>
              <AvatarImage src={userProfile?.avatar_url || undefined} />
              <AvatarFallback className={cn(roleColor.avatarBg, roleColor.avatarText)}>
                {userProfile?.full_name?.charAt(0) || userProfile?.email?.charAt(0) || "S"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate max-w-[120px]">
                {userProfile?.full_name || userProfile?.email || "Super Mod"}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4 w-fit",
                  roleColor.badge,
                  roleColor.badgeBorder
                )}
              >
                {roleLabel}
              </Badge>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {isOpen && (
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  const badgeCount = getItemBadge(item.path);

                  return (
                    <Button
                      key={itemIndex}
                      variant={active ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3 relative",
                        !isOpen && "justify-center px-2",
                        active && "bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20"
                      )}
                      onClick={() => navigate(item.path)}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? roleColor.iconActive : roleColor.iconDefault
                        )}
                      />
                      {isOpen && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {badgeCount !== undefined && (
                            <Badge
                              variant="destructive"
                              className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px]"
                            >
                              {badgeCount}
                            </Badge>
                          )}
                        </>
                      )}
                      {!isOpen && badgeCount !== undefined && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                          {badgeCount}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-1">
        <Button
          variant="ghost"
          className={cn("w-full justify-start gap-3", !isOpen && "justify-center px-2")}
          onClick={() => navigate("/")}
        >
          <Home className="h-4 w-4 shrink-0" />
          {isOpen && <span>Back to Site</span>}
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10",
            !isOpen && "justify-center px-2"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {isOpen && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
};

export default SuperModeratorSidebar;
