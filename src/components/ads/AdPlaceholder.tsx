import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

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
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    // Only initialize if we have valid credentials (not placeholder values)
    const hasValidCredentials = 
      googleAdSlot && 
      googleAdClient && 
      !googleAdClient.includes("XXXXXXXX") &&
      googleAdSlot !== "1234567890";

    if (hasValidCredentials && adRef.current && !adLoaded) {
      try {
        // Initialize Google AdSense
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdLoaded(true);
      } catch (error) {
        console.error("AdSense error:", error);
      }
    }
  }, [googleAdSlot, googleAdClient, adLoaded]);

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

  const getAdFormat = () => {
    switch (adType) {
      case "sidebar":
        return "auto";
      case "in-content":
        return "fluid";
      case "banner":
        return "horizontal";
      default:
        return "auto";
    }
  };

  // Check if we have valid (non-placeholder) credentials
  const hasValidCredentials = 
    googleAdSlot && 
    googleAdClient && 
    !googleAdClient.includes("XXXXXXXX") &&
    googleAdSlot !== "1234567890";

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
      {hasValidCredentials ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: "100%" }}
          data-ad-client={googleAdClient}
          data-ad-slot={googleAdSlot}
          data-ad-format={getAdFormat()}
          data-full-width-responsive="true"
        />
      ) : (
        <div className="text-muted-foreground text-sm text-center">
          <div className="font-medium">Ad Placeholder</div>
          <div className="text-xs opacity-70 mt-1">{adType}</div>
          {googleAdSlot && (
            <div className="text-xs opacity-50 mt-2">
              Slot: {googleAdSlot}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdPlaceholder;
