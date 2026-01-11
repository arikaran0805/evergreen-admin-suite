/**
 * SeniorModeratorSidebar - Senior Moderator Role Sidebar
 * Imports ONLY seniorModerator.sidebar.ts configuration
 */
import RoleSidebar from "@/components/RoleSidebar";
import { seniorModeratorSidebarConfig } from "@/sidebar/seniorModerator.sidebar";
import ModeratorNotificationBell from "@/components/ModeratorNotificationBell";

interface SeniorModeratorSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userProfile: { full_name: string | null; avatar_url: string | null } | null;
  userId: string | null;
  getBadgeCount?: (key: string) => number;
}

const SeniorModeratorSidebar = ({
  isOpen,
  onToggle,
  userProfile,
  userId,
  getBadgeCount,
}: SeniorModeratorSidebarProps) => {
  // Map badge counts to path-based keys
  const notifications: Record<string, number> = {
    approvals: getBadgeCount?.("approvals") || 0,
    reports: getBadgeCount?.("reports") || 0,
  };

  return (
    <RoleSidebar
      config={seniorModeratorSidebarConfig}
      isOpen={isOpen}
      onToggle={onToggle}
      userProfile={userProfile}
      userId={userId}
      notifications={notifications}
      notificationBell={<ModeratorNotificationBell userId={userId} />}
      basePath="/senior-moderator"
    />
  );
};

export default SeniorModeratorSidebar;
