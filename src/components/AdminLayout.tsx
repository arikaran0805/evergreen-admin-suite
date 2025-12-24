import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, BookOpen, Files, Tags, Users, UserCog, 
  MessageSquare, Image, DollarSign, Link2, Key, Briefcase,
  Settings, BarChart3, Share2, Menu, X, LogOut, Home, GraduationCap,
  ClipboardCheck, Trash2, Activity, Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserRole } from "@/hooks/useUserRole";

interface AdminLayoutProps {
  children: ReactNode;
  defaultSidebarCollapsed?: boolean;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  adminOnly?: boolean;
  badge?: number;
}

interface PendingCounts {
  approvals: number;
  deleteRequests: number;
}

const AdminLayout = ({ children, defaultSidebarCollapsed = false }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(!defaultSidebarCollapsed);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ approvals: 0, deleteRequests: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isModerator, isLoading: roleLoading, userId } = useUserRole();

  // Menu items with role-based visibility
  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    ];

    // Admin-only: Approval Queue
    if (isAdmin) {
      items.push({ 
        icon: ClipboardCheck, 
        label: "Approval Queue", 
        path: "/admin/approvals",
        badge: pendingCounts.approvals > 0 ? pendingCounts.approvals : undefined
      });
    }

    // Delete Requests - Admin only
    if (isAdmin) {
      items.push({ 
        icon: Trash2, 
        label: "Delete Requests", 
        path: "/admin/delete-requests",
        badge: pendingCounts.deleteRequests > 0 ? pendingCounts.deleteRequests : undefined
      });
    }

    // Reports & Suggestions - Admin only
    if (isAdmin) {
      items.push({ 
        icon: Flag, 
        label: "Reports", 
        path: "/admin/reports"
      });
    }

    // Content management - available to both admins and moderators
    items.push(
      { icon: BookOpen, label: "Posts", path: "/admin/posts" },
      { icon: GraduationCap, label: "Courses", path: "/admin/courses" },
      { icon: Tags, label: "Tags", path: "/admin/tags" },
    );

    // Careers - Admin only
    if (isAdmin) {
      items.push({ icon: Briefcase, label: "Careers", path: "/admin/careers" });
    }

    // Comments - Available to both, but moderators see only their own
    items.push({ icon: MessageSquare, label: "Comments", path: "/admin/comments" });

    // Media Library - Available to both (moderators see only their own)
    items.push({ icon: Image, label: "Media Library", path: "/admin/media" });

    // My Activity - Moderators only (shows their actions and admin feedback)
    if (isModerator && !isAdmin) {
      items.push({ icon: Activity, label: "My Activity", path: "/admin/activity" });
    }

    // Social Analytics - Available to both
    items.push({ icon: Share2, label: "Social Analytics", path: "/admin/social-analytics" });

    // Analytics - Available to both (moderators see only their posts)
    items.push({ icon: BarChart3, label: "Analytics", path: "/admin/analytics" });

    // Admin-only sections
    if (isAdmin) {
      items.push(
        { icon: Files, label: "Pages", path: "/admin/pages", adminOnly: true },
        { icon: Users, label: "Users", path: "/admin/users", adminOnly: true },
        { icon: UserCog, label: "Authors/Admins", path: "/admin/authors", adminOnly: true },
        { icon: DollarSign, label: "Monetization", path: "/admin/monetization", adminOnly: true },
        { icon: Link2, label: "Redirects", path: "/admin/redirects", adminOnly: true },
        { icon: Key, label: "API & Integrations", path: "/admin/api", adminOnly: true },
      );
    }

    return items;
  };

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingCount();
    }
  }, [isAdmin]);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchPendingCount = async () => {
    try {
      // Count pending posts
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Count pending courses
      const { count: coursesCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Count pending careers
      const { count: careersCount } = await supabase
        .from("careers")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Count pending tags
      const { count: tagsCount } = await supabase
        .from("tags")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Count pending delete requests
      const { count: deleteRequestsCount } = await supabase
        .from("delete_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const approvalsTotal = (postsCount || 0) + (coursesCount || 0) + (careersCount || 0) + (tagsCount || 0);
      setPendingCounts({
        approvals: approvalsTotal,
        deleteRequests: deleteRequestsCount || 0
      });
    } catch (error) {
      console.error("Error fetching pending count:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out successfully",
      });
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

  const menuItems = getMenuItems();
  const roleLabel = isAdmin ? "Admin" : isModerator ? "Moderator" : "User";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 fixed h-full z-50`}
      >
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.full_name || "User"} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {userProfile?.full_name?.charAt(0)?.toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-sidebar-foreground truncate max-w-[120px] text-sm">
                  {userProfile?.full_name || "User"}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 w-fit">
                  {roleLabel}
                </Badge>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <nav className="p-2">
            {menuItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={`w-full justify-start mb-1 ${
                    isActive(item.path)
                      ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className={`${sidebarOpen ? "mr-2" : ""} h-5 w-5`} />
                  {sidebarOpen && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                  {sidebarOpen && item.badge && (
                    <Badge variant="destructive" className="ml-auto text-xs h-5 min-w-5 flex items-center justify-center">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            ))}
            
            {/* Settings - Admin only */}
            {isAdmin && (
              <div className="mt-6 pt-4 border-t border-sidebar-border/50">
                <Link to="/admin/settings">
                  <Button
                    variant={isActive("/admin/settings") ? "default" : "ghost"}
                    size="sm"
                    className={`w-full justify-start ${
                      isActive("/admin/settings")
                        ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Settings className={`${sidebarOpen ? "mr-2" : ""} h-4 w-4`} />
                    {sidebarOpen && <span className="text-xs">Settings</span>}
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-sidebar-border bg-sidebar">
          <Link to="/">
            <Button
              variant="ghost"
              className="w-full justify-start mb-1 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Home className={`${sidebarOpen ? "mr-2" : ""} h-5 w-5`} />
              {sidebarOpen && <span>Back to Site</span>}
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className={`${sidebarOpen ? "mr-2" : ""} h-5 w-5`} />
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`${
          sidebarOpen ? "ml-64" : "ml-16"
        } flex-1 transition-all duration-300`}
      >
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
