import { ReactNode, useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useAdminBadgeReads } from "@/hooks/useAdminBadgeReads";
import NotificationDropdown from "@/components/NotificationDropdown";
import AdminSidebar from "@/components/AdminSidebar";
import ModeratorSidebar from "@/components/ModeratorSidebar";
import SeniorModeratorSidebar from "@/components/SeniorModeratorSidebar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  defaultSidebarCollapsed?: boolean;
}

// Helper function to get page title from pathname
const getPageTitle = (pathname: string): string => {
  const pageTitles: Record<string, string> = {
    "/admin": "Dashboard",
    "/admin/posts": "Posts",
    "/admin/courses": "Courses",
    "/admin/courses-panel": "Courses Panel",
    "/admin/tags": "Tags",
    "/admin/authors": "Roles & Permissions",
    "/admin/users": "Users",
    "/admin/comments": "Comments",
    "/admin/media": "Media Library",
    "/admin/monetization": "Monetization",
    "/admin/pages": "Pages",
    "/admin/redirects": "Redirects",
    "/admin/api": "API & Integrations",
    "/admin/careers": "Careers",
    "/admin/difficulty-levels": "Difficulty Levels",
    "/admin/settings": "Settings",
    "/admin/analytics": "Analytics",
    "/admin/social-analytics": "Social Analytics",
    "/admin/approvals": "Approval Queue",
    "/admin/delete-requests": "Delete Requests",
    "/admin/moderator-activity": "Moderator Activity",
    "/admin/reports": "Reports",
    "/admin/annotations": "Annotations",
  };

  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  if (pathname.startsWith("/admin/posts/")) return "Edit Post";
  if (pathname.startsWith("/admin/courses/")) return "Edit Course";
  if (pathname.startsWith("/admin/careers/")) return "Edit Career";
  if (pathname.startsWith("/admin/post-versions/")) return "Post Versions";

  return "Admin";
};

// Helper function to get page subtitle
const getPageSubtitle = (pathname: string): string => {
  const subtitles: Record<string, string> = {
    "/admin": "Platform overview & system control",
    "/admin/approvals": "Review and approve content submissions",
    "/admin/delete-requests": "Manage content deletion requests",
    "/admin/reports": "Review user reports and feedback",
    "/admin/posts": "Manage blog posts and articles",
    "/admin/courses": "Manage educational courses",
    "/admin/careers": "Manage career paths",
    "/admin/tags": "Organize content with tags",
    "/admin/pages": "Manage static pages",
    "/admin/media": "Upload and manage media files",
    "/admin/comments": "Moderate user comments",
    "/admin/annotations": "Review content annotations",
    "/admin/analytics": "Track performance metrics",
    "/admin/social-analytics": "Social media insights",
    "/admin/users": "Manage platform users",
    "/admin/authors": "Manage roles and permissions",
    "/admin/monetization": "Revenue and payments",
    "/admin/redirects": "URL redirect management",
    "/admin/api": "API keys and integrations",
    "/admin/settings": "Platform configuration",
  };

  return subtitles[pathname] || "";
};

const AdminLayout = ({ children, defaultSidebarCollapsed = false }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(!defaultSidebarCollapsed);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const location = useLocation();
  const { isAdmin, isSeniorModerator, isModerator, userId } = useUserRole();
  const { notifications } = useAdminNotifications(isAdmin || isSeniorModerator, userId);
  const { getUnreadCount, markBadgeSeen } = useAdminBadgeReads(userId);

  const badgeKeyMap: Record<string, string> = useMemo(() => ({
    "/admin/approvals": "totalApprovals",
    "/admin/delete-requests": "deleteRequests",
    "/admin/reports": "reports",
    "/admin/posts": "pendingPosts",
    "/admin/courses": "pendingCourses",
    "/admin/tags": "pendingTags",
    "/admin/comments": "pendingComments",
    "/admin/media": "mediaLibrary",
    "/admin/users": "newUsers",
    "/admin/annotations": "openAnnotations",
  }), []);

  useEffect(() => {
    const badgeKey = badgeKeyMap[location.pathname];
    if (badgeKey && notifications[badgeKey as keyof typeof notifications] !== undefined) {
      const currentCount = notifications[badgeKey as keyof typeof notifications];
      if (typeof currentCount === "number" && currentCount > 0) {
        markBadgeSeen(badgeKey, currentCount);
      }
    }
  }, [location.pathname, notifications, badgeKeyMap, markBadgeSeen]);

  const getBadgeCount = (badgeKey: string, currentCount: number): number | undefined => {
    const unread = getUnreadCount(badgeKey, currentCount);
    return unread > 0 ? unread : undefined;
  };

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

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

  const pageTitle = getPageTitle(location.pathname);
  const pageSubtitle = getPageSubtitle(location.pathname);

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Render appropriate sidebar based on role */}
      {isAdmin ? (
        <AdminSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          userProfile={userProfile}
          userId={userId}
          notifications={notifications}
          getBadgeCount={getBadgeCount}
        />
      ) : isSeniorModerator ? (
        <SeniorModeratorSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          userProfile={userProfile}
          userId={userId}
          getBadgeCount={(key) => getBadgeCount(key, notifications[key as keyof typeof notifications] as number || 0)}
        />
      ) : isModerator ? (
        <ModeratorSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          userProfile={userProfile}
          userId={userId}
        />
      ) : null}

      {/* Main Content */}
      <main
        className={`flex-1 min-w-0 transition-all duration-300 ${
          sidebarOpen ? "pl-64" : "pl-[68px]"
        }`}
      >
        
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
