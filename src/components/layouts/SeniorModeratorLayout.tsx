import { ReactNode, useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useAdminBadgeReads } from "@/hooks/useAdminBadgeReads";
import SeniorModeratorSidebar from "@/components/SeniorModeratorSidebar";

interface SeniorModeratorLayoutProps {
  children: ReactNode;
  defaultSidebarCollapsed?: boolean;
}

const getPageTitle = (pathname: string): string => {
  const pageTitles: Record<string, string> = {
    "/senior-moderator/dashboard": "Dashboard",
    "/senior-moderator/approvals": "Approval Queue",
    "/senior-moderator/posts": "Posts",
    "/senior-moderator/courses": "Courses",
    "/senior-moderator/tags": "Tags",
    "/senior-moderator/pages": "Pages",
    "/senior-moderator/comments": "Comments",
    "/senior-moderator/annotations": "Annotations",
    "/senior-moderator/media": "Media Library",
    "/senior-moderator/reports": "Reports",
    "/senior-moderator/activity": "Activity Log",
    "/senior-moderator/analytics": "Analytics",
    "/senior-moderator/users": "Users",
  };

  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/senior-moderator/posts/")) return "Edit Post";
  if (pathname.startsWith("/senior-moderator/courses/")) return "Edit Course";

  return "Senior Moderator";
};

const SeniorModeratorLayout = ({ children, defaultSidebarCollapsed = false }: SeniorModeratorLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(!defaultSidebarCollapsed);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const location = useLocation();
  const { userId } = useUserRole();
  const { notifications } = useAdminNotifications(true, userId);
  const { getUnreadCount, markBadgeSeen } = useAdminBadgeReads(userId);

  const badgeKeyMap: Record<string, string> = useMemo(() => ({
    "/senior-moderator/approvals": "totalApprovals",
    "/senior-moderator/reports": "reports",
    "/senior-moderator/posts": "pendingPosts",
    "/senior-moderator/courses": "pendingCourses",
    "/senior-moderator/tags": "pendingTags",
    "/senior-moderator/comments": "pendingComments",
    "/senior-moderator/annotations": "openAnnotations",
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

  const getBadgeCount = (badgeKey: string): number | undefined => {
    const currentCount = notifications[badgeKey as keyof typeof notifications];
    if (typeof currentCount !== "number") return undefined;
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

  return (
    <div className="min-h-screen bg-background flex w-full">
      <SeniorModeratorSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userProfile={userProfile}
        userId={userId}
        getBadgeCount={getBadgeCount}
      />

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

export default SeniorModeratorLayout;
