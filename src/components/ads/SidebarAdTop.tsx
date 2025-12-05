import AdPlaceholder from "./AdPlaceholder";

interface SidebarAdTopProps {
  googleAdSlot?: string;
  googleAdClient?: string;
  className?: string;
}

const SidebarAdTop = ({ 
  googleAdSlot, 
  googleAdClient,
  className = "" 
}: SidebarAdTopProps) => {
  return (
    <AdPlaceholder
      googleAdSlot={googleAdSlot}
      googleAdClient={googleAdClient}
      adType="sidebar"
      className={className}
    />
  );
};

export default SidebarAdTop;
