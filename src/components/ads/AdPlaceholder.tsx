import { useEffect, useRef } from "react";

interface AdPlaceholderProps {
  googleAdSlot?: string;
  googleAdClient?: string;
  adType?: "sidebar" | "in-content" | "banner";
  className?: string;
}

const AdPlaceholder = ({ 
  googleAdSlot, 
  googleAdClient, 
  adType = "sidebar",
  className = "" 
}: AdPlaceholderProps) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This is where the actual AdSense script would be initialized
    // For now, we show a placeholder
    if (googleAdSlot && googleAdClient && adRef.current) {
      // Future: Initialize Google AdSense here
      // (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  }, [googleAdSlot, googleAdClient]);

  const getAdDimensions = () => {
    switch (adType) {
      case "sidebar":
        return "min-h-[250px]";
      case "in-content":
        return "min-h-[90px]";
      case "banner":
        return "min-h-[100px]";
      default:
        return "min-h-[250px]";
    }
  };

  return (
    <div 
      ref={adRef}
      className={`
        rounded-lg border border-border/50 p-2 bg-muted/30
        flex items-center justify-center
        ${getAdDimensions()}
        ${className}
      `}
      data-ad-slot={googleAdSlot}
      data-ad-client={googleAdClient}
      data-ad-type={adType}
    >
      {(!googleAdSlot || !googleAdClient) && (
        <div className="text-muted-foreground text-sm text-center">
          <div className="font-medium">Ad Placeholder</div>
          <div className="text-xs opacity-70">{adType}</div>
        </div>
      )}
    </div>
  );
};

export default AdPlaceholder;
