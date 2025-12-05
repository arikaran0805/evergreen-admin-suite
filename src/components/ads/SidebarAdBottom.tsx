import AdPlaceholder from "./AdPlaceholder";

interface SidebarAdBottomProps {
  googleAdSlot?: string;
  googleAdClient?: string;
  className?: string;
}

const SidebarAdBottom = ({ 
  googleAdSlot, 
  googleAdClient,
  className = "" 
}: SidebarAdBottomProps) => {
  return (
    <AdPlaceholder
      googleAdSlot={googleAdSlot}
      googleAdClient={googleAdClient}
      adType="sidebar"
      className={className}
    />
  );
};

export default SidebarAdBottom;
