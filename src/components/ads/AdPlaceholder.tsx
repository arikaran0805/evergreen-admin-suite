import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

// Track if script is already being loaded/loaded
let scriptLoading = false;
let scriptLoaded = false;

const loadAdSenseScript = (adClient: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (scriptLoaded) {
      resolve();
      return;
    }
    
    if (scriptLoading) {
      // Wait for existing script to load
      const checkInterval = setInterval(() => {
        if (scriptLoaded) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    scriptLoading = true;
    
    const script = document.createElement("script");
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
    script.async = true;
    script.crossOrigin = "anonymous";
    
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
    };
    
    script.onerror = () => {
      scriptLoading = false;
      reject(new Error("Failed to load AdSense script"));
    };
    
    document.head.appendChild(script);
  });
};

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
  const [scriptReady, setScriptReady] = useState(false);

  // Check if we have valid (non-placeholder) credentials
  const hasValidCredentials = 
    googleAdSlot && 
    googleAdClient && 
    !googleAdClient.includes("XXXXXXXX") &&
    googleAdSlot !== "1234567890";

  // Load the AdSense script when valid credentials are available
  useEffect(() => {
    if (hasValidCredentials && googleAdClient) {
      loadAdSenseScript(googleAdClient)
        .then(() => setScriptReady(true))
        .catch((error) => console.error("AdSense script error:", error));
    }
  }, [hasValidCredentials, googleAdClient]);

  // Initialize the ad once script is ready
  useEffect(() => {
    if (scriptReady && hasValidCredentials && adRef.current && !adLoaded) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdLoaded(true);
      } catch (error) {
        console.error("AdSense initialization error:", error);
      }
    }
  }, [scriptReady, hasValidCredentials, adLoaded]);

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

  // Don't render anything if no valid credentials in production
  if (!hasValidCredentials) {
    return null;
  }

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
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "100%" }}
        data-ad-client={googleAdClient}
        data-ad-slot={googleAdSlot}
        data-ad-format={getAdFormat()}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdPlaceholder;
