import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, FileText, Files, Tags, Users, UserCog, 
  MessageSquare, Image, DollarSign, Link2, Key, Webhook, 
  Settings, BarChart3, Share2, Menu, X, LogOut, Home, Layers, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminLayoutProps {
  children: ReactNode;
}

const adminMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: FileText, label: "Posts", path: "/admin/posts" },
  { icon: Files, label: "Pages", path: "/admin/pages" },
  { icon: GraduationCap, label: "Courses", path: "/admin/courses" },
  { icon: Layers, label: "Difficulty Levels", path: "/admin/difficulty-levels" },
  { icon: Tags, label: "Tags", path: "/admin/tags" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: UserCog, label: "Authors/Admins", path: "/admin/authors" },
  { icon: MessageSquare, label: "Comments", path: "/admin/comments" },
  { icon: Image, label: "Media Library", path: "/admin/media" },
  { icon: DollarSign, label: "Monetization", path: "/admin/monetization" },
  { icon: Link2, label: "Redirects", path: "/admin/redirects" },
  { icon: Key, label: "API & Integrations", path: "/admin/api" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: Share2, label: "Social Analytics", path: "/admin/social-analytics" },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();
  }, []);

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
              <span className="font-semibold text-sidebar-foreground truncate max-w-[140px]">
                {userProfile?.full_name || "Admin"}
              </span>
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
            {adminMenuItems.map((item) => (
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
                  {sidebarOpen && <span>{item.label}</span>}
                </Button>
              </Link>
            ))}
            
            {/* Settings - Less Prominent */}
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
