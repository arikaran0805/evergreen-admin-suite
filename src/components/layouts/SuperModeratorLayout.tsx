import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import SuperModeratorSidebar from "@/components/SuperModeratorSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useAdminBadgeReads } from "@/hooks/useAdminBadgeReads";
import { cn } from "@/lib/utils";
import { GlobalCommandSearch } from "@/components/GlobalCommandSearch";

interface SuperModeratorLayoutProps {
  children: ReactNode;
  defaultSidebarCollapsed?: boolean;
}

const getPageTitle = (pathname: string): string => {
  const pathMap: Record<string, string> = {
    "/super-moderator": "Dashboard",
    "/super-moderator/dashboard": "Dashboard",
    "/super-moderator/approvals": "Approvals",
    "/super-moderator/reports": "Reports",
    "/super-moderator/careers": "My Careers",
    "/super-moderator/courses": "Courses",
    "/super-moderator/posts": "Posts",
    "/super-moderator/tags": "Tags",
    "/super-moderator/pages": "Pages",
    "/super-moderator/comments": "Comments",
    "/super-moderator/annotations": "Annotations",
    "/super-moderator/media": "Media Library",
    "/super-moderator/assignments": "Team Assignments",
    "/super-moderator/users": "Users",
    "/super-moderator/analytics": "Analytics",
    "/super-moderator/activity": "Activity Log",
  };
  return pathMap[pathname] || "Super Moderator";
};

const SuperModeratorLayout = ({
  children,
  defaultSidebarCollapsed = false,
}: SuperModeratorLayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(!defaultSidebarCollapsed);
  const [commandSearchOpen, setCommandSearchOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name?: string | null;
    email?: string;
    avatar_url?: string | null;
  } | null>(null);

  const { userId, activeRole } = useAuth();
  const { notifications } = useAdminNotifications(activeRole === "super_moderator", userId);
  const { markBadgeSeen, getUnreadCount } = useAdminBadgeReads(userId);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, email, avatar_url")
          .eq("id", session.user.id)
          .single();
        setUserProfile(data);
      }
    };
    fetchUserProfile();
  }, []);

  // Mark badges as seen based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const badgeKeyMap: Record<string, string> = {
      "/super-moderator/approvals": "approvals",
      "/super-moderator/reports": "reports",
    };
    
    const badgeKey = badgeKeyMap[currentPath];
    if (badgeKey && notifications) {
      const countMap: Record<string, number> = {
        approvals: notifications.totalApprovals || 0,
        reports: notifications.reports || 0,
      };
      const count = countMap[badgeKey] || 0;
      if (count > 0) {
        markBadgeSeen(badgeKey, count);
      }
    }
  }, [location.pathname, notifications, markBadgeSeen]);

  const getBadgeCount = (path: string): number => {
    if (!notifications) return 0;
    
    const badgeKeyMap: Record<string, string> = {
      "/super-moderator/approvals": "approvals",
      "/super-moderator/reports": "reports",
    };
    
    const badgeKey = badgeKeyMap[path];
    if (!badgeKey) return 0;
    
    const countMap: Record<string, number> = {
      approvals: notifications.totalApprovals || 0,
      reports: notifications.reports || 0,
    };
    
    const totalCount = countMap[badgeKey] || 0;
    const unseenCount = getUnreadCount(badgeKey, totalCount);
    return unseenCount;
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <>
      <GlobalCommandSearch open={commandSearchOpen} onOpenChange={setCommandSearchOpen} />
      <div className="min-h-screen bg-background">
        <SuperModeratorSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          userProfile={userProfile}
          userId={userId}
          getBadgeCount={getBadgeCount}
        />
        <main
          className={cn(
            "min-h-screen transition-all duration-300",
            sidebarOpen ? "pl-64" : "pl-16"
          )}
        >
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
            </div>
            {children}
          </div>
        </main>
      </div>
    </>
  );
};

export default SuperModeratorLayout;
