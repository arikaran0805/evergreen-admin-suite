/**
 * PricingDrawer Component
 * 
 * Slide-in panel for Pro upgrade flow.
 * - Desktop: Right-side sheet (360-420px)
 * - Mobile: Bottom drawer with swipe-to-close
 * 
 * Shows Pro value proposition and pricing options.
 * Never rendered for Pro users.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, Check, StickyNote, Sparkles, GraduationCap, Ban, Shield, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { usePricingDrawer } from "@/contexts/PricingDrawerContext";
import { useUserState } from "@/hooks/useUserState";
import { useIsMobile } from "@/hooks/use-mobile";

// Pro features to display
const PRO_FEATURES = [
  { icon: Check, label: "Full access to all lessons", color: "text-primary" },
  { icon: StickyNote, label: "Quick & Deep Notes", color: "text-primary" },
  { icon: Sparkles, label: "Practice & Reinforcement", color: "text-primary" },
  { icon: GraduationCap, label: "Course Completion Certificate", color: "text-amber-500" },
  { icon: Ban, label: "No ads while learning", color: "text-primary" },
];

// Pricing tiers
const PRICING = {
  monthly: {
    price: 499,
    currency: "₹",
    period: "month",
  },
  yearly: {
    price: 3999,
    currency: "₹",
    period: "year",
    savings: "33%",
    recommended: true,
  },
};

interface PricingContentProps {
  onClose: () => void;
}

const PricingContent = ({ onClose }: PricingContentProps) => {
  const navigate = useNavigate();
  const { isGuest, isLearner } = useUserState();
  const { closePricingDrawer, triggerSource } = usePricingDrawer();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    
    // Analytics: Upgrade CTA clicked
    console.log("[Analytics] Upgrade CTA clicked", { 
      plan: selectedPlan, 
      source: triggerSource,
      userState: isGuest ? "guest" : "learner",
    });

    if (isGuest) {
      // Guest: Redirect to login with upgrade intent
      closePricingDrawer();
      navigate("/login?intent=upgrade");
    } else {
      // Learner: Proceed to payment flow
      // TODO: Integrate with Stripe checkout
      console.log("[Payment] Initiating checkout for plan:", selectedPlan);
      
      // Simulate loading
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsLoading(false);
    }
  };

  const handleMaybeLater = () => {
    closePricingDrawer(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Value Proposition - What You Get */}
      <div className="flex-1 overflow-y-auto px-1">
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            What you get
          </h3>
          <ul className="space-y-3">
            {PRO_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.label} className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Icon className={`h-4 w-4 ${feature.color}`} />
                  </div>
                  <span className="text-sm text-foreground">{feature.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Pricing Options */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Choose your plan
          </h3>
          
          {/* Yearly Plan */}
          <button
            onClick={() => setSelectedPlan("yearly")}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left relative ${
              selectedPlan === "yearly"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            {PRICING.yearly.recommended && (
              <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                Recommended
              </span>
            )}
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold text-foreground">
                  {PRICING.yearly.currency}{PRICING.yearly.price}
                </span>
                <span className="text-sm text-muted-foreground ml-1">
                  / {PRICING.yearly.period}
                </span>
              </div>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                Save {PRICING.yearly.savings}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Billed annually
            </p>
          </button>

          {/* Monthly Plan */}
          <button
            onClick={() => setSelectedPlan("monthly")}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              selectedPlan === "monthly"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-foreground">
                {PRICING.monthly.currency}{PRICING.monthly.price}
              </span>
              <span className="text-sm text-muted-foreground ml-1">
                / {PRICING.monthly.period}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Billed monthly
            </p>
          </button>
        </div>
      </div>

      {/* Actions - Fixed at Bottom */}
      <div className="border-t border-border pt-4 mt-auto space-y-3">
        {/* Primary CTA */}
        <Button
          className="w-full h-11"
          size="lg"
          onClick={handleUpgrade}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </span>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              {isGuest ? "Sign in & Upgrade" : "Upgrade to Pro"}
            </>
          )}
        </Button>

        {/* Secondary Action */}
        <button
          onClick={handleMaybeLater}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Maybe later
        </button>

        {/* Trust Signals */}
        <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Secure payment
          </span>
          <span>•</span>
          <span>Cancel anytime</span>
          <span>•</span>
          <span>Instant access</span>
        </div>
      </div>
    </div>
  );
};

export const PricingDrawer = () => {
  const { isOpen, closePricingDrawer } = usePricingDrawer();
  const { isPro } = useUserState();
  const isMobile = useIsMobile();

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closePricingDrawer(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closePricingDrawer]);

  // Never render for Pro users
  if (isPro) return null;

  // Mobile: Bottom drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && closePricingDrawer(false)}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-xl font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Upgrade to Pro
            </DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Unlock the full learning experience
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <PricingContent onClose={() => closePricingDrawer(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Right-side sheet
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closePricingDrawer(false)}>
      <SheetContent 
        side="right" 
        className="w-[400px] sm:max-w-[420px] flex flex-col"
      >
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Upgrade to Pro
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Unlock the full learning experience
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 py-4 overflow-hidden">
          <PricingContent onClose={() => closePricingDrawer(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PricingDrawer;
