/**
 * PricingDrawerContext
 * 
 * Global context for managing the Pricing Drawer state.
 * Provides open/close functionality and tracks analytics events.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useUserState } from "@/hooks/useUserState";

interface PricingDrawerContextType {
  isOpen: boolean;
  openPricingDrawer: (source?: string) => void;
  closePricingDrawer: (upgraded?: boolean) => void;
  triggerSource: string | null;
}

const PricingDrawerContext = createContext<PricingDrawerContextType | undefined>(undefined);

export const PricingDrawerProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerSource, setTriggerSource] = useState<string | null>(null);
  const { isPro } = useUserState();

  const openPricingDrawer = useCallback((source?: string) => {
    // Never show pricing drawer to Pro users
    if (isPro) return;
    
    setTriggerSource(source || "unknown");
    setIsOpen(true);
    
    // Analytics: Pricing drawer opened
    console.log("[Analytics] Pricing drawer opened", { source });
  }, [isPro]);

  const closePricingDrawer = useCallback((upgraded?: boolean) => {
    setIsOpen(false);
    
    // Analytics: Drawer closed
    if (!upgraded) {
      console.log("[Analytics] Pricing drawer closed without upgrade", { source: triggerSource });
    }
    
    // Reset trigger source after close
    setTimeout(() => setTriggerSource(null), 300);
  }, [triggerSource]);

  return (
    <PricingDrawerContext.Provider
      value={{
        isOpen,
        openPricingDrawer,
        closePricingDrawer,
        triggerSource,
      }}
    >
      {children}
    </PricingDrawerContext.Provider>
  );
};

export const usePricingDrawer = () => {
  const context = useContext(PricingDrawerContext);
  if (context === undefined) {
    throw new Error("usePricingDrawer must be used within a PricingDrawerProvider");
  }
  return context;
};

export default PricingDrawerContext;
