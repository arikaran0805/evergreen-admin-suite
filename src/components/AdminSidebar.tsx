/**
 * AdminSidebar - Admin Role Sidebar
 * Imports ONLY admin.sidebar.ts configuration
 */
import RoleSidebar from "@/components/RoleSidebar";
import { adminSidebarConfig, adminFooterItems } from "@/sidebar/admin.sidebar";
import AdminContentNotificationBell from "@/components/AdminContentNotificationBell";

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

const AdminSidebar = ({
  isOpen,
  onToggle,
  userProfile,
  userId,
  notifications,
  getBadgeCount,
}: AdminSidebarProps) => {
  // Map notification keys to path-based keys for the generic sidebar
  const mappedNotifications: Record<string, number> = {
    approvals: notifications.totalApprovals,
    "delete-requests": notifications.deleteRequests,
    reports: notifications.reports,
    posts: notifications.pendingPosts,
    courses: notifications.pendingCourses,
    tags: notifications.pendingTags,
    comments: notifications.pendingComments,
    media: notifications.mediaLibrary,
    users: notifications.newUsers,
    annotations: notifications.openAnnotations,
  };

  return (
    <RoleSidebar
      config={adminSidebarConfig}
      isOpen={isOpen}
      onToggle={onToggle}
      userProfile={userProfile}
      userId={userId}
      notifications={mappedNotifications}
      getBadgeCount={getBadgeCount}
      notificationBell={<AdminContentNotificationBell userId={userId} />}
      footerItems={adminFooterItems}
      showSearch={true}
      basePath="/admin"
    />
  );
};

export default AdminSidebar;
