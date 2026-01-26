import { SidebarAdTop, SidebarAdMiddle, SidebarAdBottom } from "@/components/ads";
import { cn } from "@/lib/utils";

interface CourseSidebarAdsProps {
  adSettings: {
    googleAdClient?: string;
    sidebarTopSlot?: string;
    sidebarMiddleSlot?: string;
    sidebarBottomSlot?: string;
  } | null;
  isHeaderVisible: boolean;
  showAnnouncement: boolean;
  className?: string;
}

/**
 * Ad slots for course sidebar - shown to guests and free learners
 * Pro users never see this component
 */
export const CourseSidebarAds = ({
  adSettings,
  isHeaderVisible,
  showAnnouncement,
  className = "",
}: CourseSidebarAdsProps) => {
  // Calculate sticky position
  const stickyTopClass = isHeaderVisible
    ? (showAnnouncement ? 'top-[8.75rem]' : 'top-[6.5rem]')
    : (showAnnouncement ? 'top-[4.75rem]' : 'top-10');

  return (
    <aside className={cn("hidden xl:block w-[300px] flex-shrink-0", className)}>
      <div className={cn("sticky transition-[top] duration-200 ease-out", stickyTopClass)}>
        <div className="space-y-4 p-1 pb-6">
          {/* Top Ad Slot */}
          <SidebarAdTop
            googleAdSlot={adSettings?.sidebarTopSlot}
            googleAdClient={adSettings?.googleAdClient}
          />

          {/* Middle Ad Slot */}
          <SidebarAdMiddle
            googleAdSlot={adSettings?.sidebarMiddleSlot}
            googleAdClient={adSettings?.googleAdClient}
          />

          {/* Bottom Ad Slot */}
          <SidebarAdBottom
            googleAdSlot={adSettings?.sidebarBottomSlot}
            googleAdClient={adSettings?.googleAdClient}
          />
        </div>
      </div>
    </aside>
  );
};

export default CourseSidebarAds;
