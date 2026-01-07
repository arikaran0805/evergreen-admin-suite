import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, BookOpen, Tags, 
  MessageSquare, Image, GraduationCap,
  LogOut, Home, MessageSquarePlus, 
  ChevronRight, X, FileText, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ModeratorNotificationBell from "@/components/ModeratorNotificationBell";
import { cn } from "@/lib/utils";

interface ModeratorSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userProfile: { full_name: string | null; avatar_url: string | null } | null;
  userId: string | null;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const ModeratorSidebar = ({ 
  isOpen, 
  onToggle, 
  userProfile, 
  userId
}: ModeratorSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

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
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  // Section 1: Overview
  const overviewSection: MenuSection = {
    title: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    ],
  };

  // Section 2: My Work
  const workSection: MenuSection = {
    title: "My Work",
    items: [
      { icon: BookOpen, label: "Posts", path: "/admin/posts" },
      { icon: GraduationCap, label: "Courses", path: "/admin/courses" },
      { icon: Tags, label: "Tags", path: "/admin/tags" },
    ],
  };

  // Section 3: Moderation
  const moderationSection: MenuSection = {
    title: "Moderation",
    items: [
      { icon: MessageSquare, label: "Comments", path: "/admin/comments" },
      { icon: MessageSquarePlus, label: "Annotations", path: "/admin/annotations" },
      { icon: Image, label: "Media Library", path: "/admin/media" },
    ],
  };

  // Section 4: Activity
  const activitySection: MenuSection = {
    title: "Activity",
    items: [
      { icon: Activity, label: "My Activity", path: "/admin/activity" },
    ],
  };

  const sections = [overviewSection, workSection, moderationSection, activitySection];

  const renderMenuItem = (item: MenuItem) => {
    const active = isActive(item.path);
    
    return (
      <Link key={item.path} to={item.path}>
        <div
          className={cn(
            "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            active
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent/60"
          )}
        >
          <item.icon className={cn(
            "h-[18px] w-[18px] shrink-0",
            active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-foreground"
          )} />
          {isOpen && (
            <span className={cn(
              "flex-1 text-sm font-medium truncate",
              active ? "text-primary-foreground" : ""
            )}>
              {item.label}
            </span>
          )}
        </div>
      </Link>
    );
  };

  const renderSection = (section: MenuSection, index: number) => (
    <div key={section.title} className={cn(index > 0 && "mt-6")}>
      {isOpen && (
        <div className="px-3 mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {section.title}
          </span>
        </div>
      )}
      {!isOpen && index > 0 && (
        <Separator className="mx-2 mb-2 bg-sidebar-border/50" />
      )}
      <div className="space-y-0.5">
        {section.items.map(renderMenuItem)}
      </div>
    </div>
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 flex flex-col",
        isOpen ? "w-64" : "w-[68px]"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {isOpen ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10 shrink-0 ring-2 ring-accent/20">
                <AvatarImage 
                  src={userProfile?.avatar_url || undefined} 
                  alt={userProfile?.full_name || "Moderator"} 
                />
                <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                  {userProfile?.full_name?.charAt(0)?.toUpperCase() || "M"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sidebar-foreground truncate text-sm">
                  {userProfile?.full_name || "Moderator"}
                </span>
                <Badge 
                  className="w-fit text-[10px] px-2 py-0 bg-accent/10 text-accent border-accent/20 font-medium"
                  variant="outline"
                >
                  Moderator
                </Badge>
              </div>
            </div>
          ) : (
            <Avatar className="h-9 w-9 mx-auto ring-2 ring-accent/20">
              <AvatarImage 
                src={userProfile?.avatar_url || undefined} 
                alt={userProfile?.full_name || "Moderator"} 
              />
              <AvatarFallback className="bg-accent text-accent-foreground font-semibold text-sm">
                {userProfile?.full_name?.charAt(0)?.toUpperCase() || "M"}
              </AvatarFallback>
            </Avatar>
          )}
          
          {isOpen && (
            <div className="flex items-center gap-1 shrink-0">
              <ModeratorNotificationBell userId={userId} />
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {sections.map((section, index) => renderSection(section, index))}
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

export default ModeratorSidebar;
