import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, BookOpen, Tags, FileText,
  MessageSquare, Image, GraduationCap,
  LogOut, Home, MessageSquarePlus, 
  ChevronLeft, ChevronRight, CheckSquare,
  BarChart3, Users, Gavel
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

interface SeniorModeratorSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userProfile: { full_name: string | null; avatar_url: string | null } | null;
  userId: string | null;
  getBadgeCount?: (key: string) => number;
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

const SeniorModeratorSidebar = ({ 
  isOpen, 
  onToggle, 
  userProfile, 
  userId,
  getBadgeCount
}: SeniorModeratorSidebarProps) => {
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

  // Section 2: Approval Queue
  const approvalSection: MenuSection = {
    title: "Approval Queue",
    items: [
      { icon: CheckSquare, label: "Approvals", path: "/admin/approvals", badge: getBadgeCount?.("approvals") },
    ],
  };

  // Section 3: Content Management
  const contentSection: MenuSection = {
    title: "Content",
    items: [
      { icon: BookOpen, label: "Posts", path: "/admin/posts" },
      { icon: GraduationCap, label: "Courses", path: "/admin/courses" },
      { icon: Tags, label: "Tags", path: "/admin/tags" },
      { icon: FileText, label: "Pages", path: "/admin/pages" },
    ],
  };

  // Section 4: Moderation
  const moderationSection: MenuSection = {
    title: "Moderation",
    items: [
      { icon: MessageSquare, label: "Comments", path: "/admin/comments" },
      { icon: MessageSquarePlus, label: "Annotations", path: "/admin/annotations" },
      { icon: Image, label: "Media Library", path: "/admin/media" },
      { icon: Gavel, label: "Reports", path: "/admin/reports", badge: getBadgeCount?.("reports") },
    ],
  };

  // Section 5: Analytics (Limited)
  const analyticsSection: MenuSection = {
    title: "Analytics",
    items: [
      { icon: BarChart3, label: "Content Analytics", path: "/admin/analytics" },
    ],
  };

  // Section 6: Users (View Only)
  const usersSection: MenuSection = {
    title: "Users",
    items: [
      { icon: Users, label: "Users", path: "/admin/users" },
    ],
  };

  const sections = [
    overviewSection, 
    approvalSection, 
    contentSection, 
    moderationSection, 
    analyticsSection,
    usersSection
  ];

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
            active ? "text-primary-foreground" : "text-[#D4AF37] group-hover:text-[#D4AF37]"
          )} />
          {isOpen && (
            <>
              <span className={cn(
                "flex-1 text-sm font-medium truncate",
                active ? "text-primary-foreground" : ""
              )}>
                {item.label}
              </span>
              {item.badge && item.badge > 0 && (
                <Badge 
                  variant="secondary" 
                  className="h-5 min-w-5 px-1.5 text-[10px] font-semibold bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20"
                >
                  {item.badge}
                </Badge>
              )}
            </>
          )}
          {!isOpen && item.badge && item.badge > 0 && (
            <div className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#D4AF37]" />
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
              <Avatar className="shrink-0 ring-2 ring-[#D4AF37]/30 h-9 w-9">
                <AvatarImage 
                  src={userProfile?.avatar_url || undefined} 
                  alt={userProfile?.full_name || "Senior Moderator"} 
                />
                <AvatarFallback className="bg-[#D4AF37]/10 text-[#D4AF37] font-semibold text-xs">
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
              className="text-[10px] px-2 py-0 bg-transparent text-[#D4AF37] border-[#D4AF37] font-medium"
              variant="outline"
            >
              Senior Moderator
            </Badge>
            <ModeratorNotificationBell userId={userId} />
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
