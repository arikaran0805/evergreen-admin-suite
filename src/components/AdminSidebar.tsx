import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, BookOpen, Files, Tags, Users, 
  MessageSquare, Image, DollarSign, Link2, Key, Briefcase,
  Settings, BarChart3, Share2, LogOut, Home, GraduationCap,
  ClipboardCheck, Trash2, Flag, MessageSquarePlus, 
  ChevronLeft, ChevronRight, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import AdminContentNotificationBell from "@/components/AdminContentNotificationBell";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userProfile: { full_name: string | null; avatar_url: string | null } | null;
  userId: string | null;
  notifications: {
    totalApprovals: number;
    deleteRequests: number;
    reports: number;
    pendingPosts: number;
    pendingCourses: number;
    pendingTags: number;
    pendingComments: number;
    mediaLibrary: number;
    newUsers: number;
    openAnnotations: number;
  };
  getBadgeCount: (badgeKey: string, currentCount: number) => number | undefined;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const AdminSidebar = ({ 
  isOpen, 
  onToggle, 
  userProfile, 
  userId, 
  notifications,
  getBadgeCount 
}: AdminSidebarProps) => {
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

  // Section 2: Workflows (High Priority)
  const workflowSection: MenuSection = {
    title: "Workflows",
    items: [
      { 
        icon: ClipboardCheck, 
        label: "Approval Queue", 
        path: "/admin/approvals",
        badge: getBadgeCount("totalApprovals", notifications.totalApprovals)
      },
      { 
        icon: Trash2, 
        label: "Delete Requests", 
        path: "/admin/delete-requests",
        badge: getBadgeCount("deleteRequests", notifications.deleteRequests)
      },
      { 
        icon: Flag, 
        label: "Reports", 
        path: "/admin/reports",
        badge: getBadgeCount("reports", notifications.reports)
      },
    ],
  };

  // Section 3: Content Management
  const contentSection: MenuSection = {
    title: "Content Management",
    items: [
      { 
        icon: BookOpen, 
        label: "Posts", 
        path: "/admin/posts", 
        badge: getBadgeCount("pendingPosts", notifications.pendingPosts) 
      },
      { 
        icon: GraduationCap, 
        label: "Courses", 
        path: "/admin/courses", 
        badge: getBadgeCount("pendingCourses", notifications.pendingCourses) 
      },
      { icon: Briefcase, label: "Careers", path: "/admin/careers" },
      { 
        icon: Tags, 
        label: "Tags", 
        path: "/admin/tags", 
        badge: getBadgeCount("pendingTags", notifications.pendingTags) 
      },
      { icon: Files, label: "Pages", path: "/admin/pages" },
      { 
        icon: Image, 
        label: "Media Library", 
        path: "/admin/media",
        badge: getBadgeCount("mediaLibrary", notifications.mediaLibrary)
      },
      { 
        icon: MessageSquare, 
        label: "Comments", 
        path: "/admin/comments",
        badge: getBadgeCount("pendingComments", notifications.pendingComments)
      },
      { 
        icon: MessageSquarePlus, 
        label: "Annotations", 
        path: "/admin/annotations",
        badge: getBadgeCount("openAnnotations", notifications.openAnnotations)
      },
    ],
  };

  // Section 4: Analytics
  const analyticsSection: MenuSection = {
    title: "Analytics",
    items: [
      { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
      { icon: Share2, label: "Social Analytics", path: "/admin/social-analytics" },
    ],
  };

  // Section 5: System & Business
  const systemSection: MenuSection = {
    title: "System & Business",
    items: [
      { 
        icon: Users, 
        label: "Users", 
        path: "/admin/users", 
        badge: getBadgeCount("newUsers", notifications.newUsers) 
      },
      { icon: Settings, label: "Roles & Permissions", path: "/admin/authors" },
      { icon: DollarSign, label: "Monetization", path: "/admin/monetization" },
      { icon: Link2, label: "Redirects", path: "/admin/redirects" },
      { icon: Key, label: "API & Integrations", path: "/admin/api" },
    ],
  };

  const sections = [overviewSection, workflowSection, contentSection, analyticsSection, systemSection];

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
            <>
              <span className={cn(
                "flex-1 text-sm font-medium truncate",
                active ? "text-primary-foreground" : ""
              )}>
                {item.label}
              </span>
              {item.badge && (
                <Badge 
                  variant="destructive" 
                  className="h-5 min-w-5 px-1.5 text-[10px] font-semibold"
                >
                  {item.badge}
                </Badge>
              )}
            </>
          )}
          {!isOpen && item.badge && (
            <span className="absolute left-10 top-0 h-2 w-2 rounded-full bg-destructive" />
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
              <Avatar className="shrink-0 ring-2 ring-primary/20 h-9 w-9">
                <AvatarImage 
                  src={userProfile?.avatar_url || undefined} 
                  alt={userProfile?.full_name || "Admin"} 
                />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                  {userProfile?.full_name?.charAt(0)?.toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sidebar-foreground text-sm">
                {userProfile?.full_name || "Admin"}
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
              className="text-[10px] px-2 py-0 bg-primary/10 text-primary border-primary/20 font-medium"
              variant="outline"
            >
              Admin
            </Badge>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                onClick={() => {
                  // Trigger global search dialog
                  const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                  document.dispatchEvent(event);
                }}
              >
                <Search className="h-4 w-4" />
              </Button>
              <AdminContentNotificationBell userId={userId} />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {sections.map((section, index) => renderSection(section, index))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border mt-auto">
        {isOpen && (
          <Link to="/admin/settings">
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 mb-1",
                isActive("/admin/settings")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Settings className="h-[18px] w-[18px]" />
              <span className="text-sm font-medium">Settings</span>
            </div>
          </Link>
        )}
        
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
        
      </div>
    </aside>
  );
};

export default AdminSidebar;
