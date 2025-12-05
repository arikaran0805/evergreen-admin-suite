import { useEffect, useRef } from "react";
import AdPlaceholder from "./AdPlaceholder";

interface SidebarAdMiddleProps {
  googleAdSlot?: string;
  googleAdClient?: string;
  thirdPartyAdCode?: string;
  className?: string;
}

const SidebarAdMiddle = ({ 
  googleAdSlot, 
  googleAdClient,
  thirdPartyAdCode,
  className = "" 
}: SidebarAdMiddleProps) => {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If third-party ad code is provided, inject it
    if (thirdPartyAdCode && adContainerRef.current) {
      // Clear previous content
      adContainerRef.current.innerHTML = "";
      
      // Create a temporary container to parse the HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = thirdPartyAdCode;
      
      // Append all children to the ad container
      while (tempDiv.firstChild) {
        adContainerRef.current.appendChild(tempDiv.firstChild);
      }
      
      // Execute any scripts in the ad code
      const scripts = adContainerRef.current.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    }
  }, [thirdPartyAdCode]);

  // If third-party ad code is provided, render it
  if (thirdPartyAdCode) {
    return (
      <div 
        ref={adContainerRef}
        className={`
          rounded-lg border border-border/50 p-2 bg-muted/30
          min-h-[250px] overflow-hidden
          ${className}
        `}
        data-ad-type="third-party"
      />
    );
  }

  // Otherwise, fall back to Google AdSense placeholder
  return (
    <AdPlaceholder
      googleAdSlot={googleAdSlot}
      googleAdClient={googleAdClient}
      adType="sidebar"
      className={className}
    />
  );
};

export default SidebarAdMiddle;
