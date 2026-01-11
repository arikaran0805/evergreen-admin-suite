/**
 * ModeratorSidebar - Moderator Role Sidebar
 * Imports ONLY moderator.sidebar.ts configuration
 */
import RoleSidebar from "@/components/RoleSidebar";
import { moderatorSidebarConfig } from "@/sidebar/moderator.sidebar";
import ModeratorNotificationBell from "@/components/ModeratorNotificationBell";

interface ModeratorSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userProfile: { full_name: string | null; avatar_url: string | null } | null;
  userId: string | null;
}

const ModeratorSidebar = ({
  isOpen,
  onToggle,
  userProfile,
  userId,
}: ModeratorSidebarProps) => {
  return (
    <RoleSidebar
      config={moderatorSidebarConfig}
      isOpen={isOpen}
      onToggle={onToggle}
      userProfile={userProfile}
      userId={userId}
      notificationBell={<ModeratorNotificationBell userId={userId} />}
      basePath="/moderator"
    />
  );
};

export default ModeratorSidebar;
