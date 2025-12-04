import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import AdDisplay from "@/components/AdDisplay";

interface CollapsibleSidebarAdsProps {
  placements?: string[];
  className?: string;
}

const CollapsibleSidebarAds = ({ 
  placements = ["sidebar", "sidebar-2", "sidebar-3"],
  className = ""
}: CollapsibleSidebarAdsProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Only trigger collapse/expand after scrolling past 200px
      if (currentScrollY > 200) {
        if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 50) {
          // Scrolling down - collapse
          setIsOpen(false);
        } else if (lastScrollY - currentScrollY > 50) {
          // Scrolling up - expand
          setIsOpen(true);
        }
      } else {
        // Near top of page - always show
        setIsOpen(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <div className={`sticky top-4 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium">Sponsored</span>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle ads</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="space-y-4 transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          {placements.map((placement) => (
            <AdDisplay 
              key={placement} 
              placement={placement} 
              className="rounded-lg overflow-hidden" 
            />
          ))}
        </CollapsibleContent>
        
        {!isOpen && (
          <div className="text-center py-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsOpen(true)}
              className="text-xs"
            >
              Show Ads
            </Button>
          </div>
        )}
      </Collapsible>
    </div>
  );
};

export default CollapsibleSidebarAds;
