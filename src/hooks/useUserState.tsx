/**
 * useUserState Hook
 * 
 * Determines user state: guest, learner, or pro
 * Also tracks entry source for conditional UI behavior
 * 
 * Entry Flow Types:
 * - "career_flow": User entered from Career Readiness/Career Board (immersive mode)
 * - "global": User entered from Home, Library, Search, Bookmarks, etc. (exploratory mode)
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type UserState = "guest" | "learner" | "pro";
export type EntrySource = "external" | "internal";
export type EntryFlow = "career_flow" | "global";

interface Subscription {
  id: string;
  status: string;
  plan: string;
  current_period_end: string | null;
}

interface UseUserStateReturn {
  /** Current user state: guest, learner, or pro */
  userState: UserState;
  /** Entry source: external (SEO, course cards) or internal (dashboard, library) */
  entrySource: EntrySource;
  /** Entry flow: career_flow (immersive) or global (exploratory) */
  entryFlow: EntryFlow;
  /** Raw subscription data if available */
  subscription: Subscription | null;
  /** Whether subscription data is still loading */
  isLoading: boolean;
  /** Check if user is a guest */
  isGuest: boolean;
  /** Check if user is a free learner */
  isLearner: boolean;
  /** Check if user is a pro/paid user */
  isPro: boolean;
  /** Check if ads should be shown */
  shouldShowAds: boolean;
  /** Check if pro features should be shown */
  shouldShowProFeatures: boolean;
  /** Check if in career flow mode (hide global header) */
  isCareerFlow: boolean;
  /** Mark the current session as internal navigation */
  markAsInternal: () => void;
  /** Mark the current session as career flow (immersive mode) */
  markAsCareerFlow: () => void;
  /** Clear career flow and return to global mode */
  clearCareerFlow: () => void;
}

// Session storage keys for entry source tracking
const ENTRY_SOURCE_KEY = "lovable_entry_source";
const ENTRY_FLOW_KEY = "lovable_entry_flow";
const INTERNAL_ROUTES = ["/profile", "/library", "/dashboard", "/moderator", "/admin", "/senior-moderator", "/super-moderator"];

/**
 * Detect if the user arrived from an internal route
 */
const detectEntrySource = (): EntrySource => {
  // Check session storage first (persists during session)
  const storedSource = sessionStorage.getItem(ENTRY_SOURCE_KEY);
  if (storedSource === "internal") return "internal";

  // Check referrer
  const referrer = document.referrer;
  if (referrer) {
    try {
      const referrerUrl = new URL(referrer);
      const currentHost = window.location.host;
      
      // If referrer is from same host, check if it's an internal route
      if (referrerUrl.host === currentHost) {
        const isInternalRoute = INTERNAL_ROUTES.some(route => 
          referrerUrl.pathname.startsWith(route)
        );
        if (isInternalRoute) {
          sessionStorage.setItem(ENTRY_SOURCE_KEY, "internal");
          return "internal";
        }
      }
    } catch {
      // Invalid referrer URL, treat as external
    }
  }

  return "external";
};

/**
 * Detect entry flow from session storage
 */
const detectEntryFlow = (): EntryFlow => {
  const storedFlow = sessionStorage.getItem(ENTRY_FLOW_KEY);
  if (storedFlow === "career_flow") return "career_flow";
  return "global";
};

export const useUserState = (): UseUserStateReturn => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [entrySource, setEntrySource] = useState<EntrySource>(() => detectEntrySource());
  const [entryFlow, setEntryFlow] = useState<EntryFlow>(() => detectEntryFlow());

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscription(null);
        setSubscriptionLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("id, status, plan, current_period_end")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching subscription:", error);
          setSubscription(null);
        } else {
          setSubscription(data);
        }
      } catch (err) {
        console.error("Subscription fetch failed:", err);
        setSubscription(null);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  // Determine user state
  const userState = useMemo((): UserState => {
    if (!isAuthenticated || !user) return "guest";
    
    // Check for active pro subscription
    if (subscription?.status === "active" && subscription?.plan === "pro") {
      // Also check if subscription hasn't expired
      if (subscription.current_period_end) {
        const endDate = new Date(subscription.current_period_end);
        if (endDate > new Date()) {
          return "pro";
        }
      } else {
        // No end date means it's active
        return "pro";
      }
    }
    
    // Trialing counts as pro
    if (subscription?.status === "trialing") {
      return "pro";
    }

    return "learner";
  }, [isAuthenticated, user, subscription]);

  // Derived states
  const isGuest = userState === "guest";
  const isLearner = userState === "learner";
  const isPro = userState === "pro";
  
  // Ads shown for guests and free learners only
  const shouldShowAds = userState !== "pro";
  
  // Pro features for pro users only
  const shouldShowProFeatures = isPro;

  // Career flow mode - hide global header, show career-scoped header
  const isCareerFlow = entryFlow === "career_flow";

  // Mark current session as internal navigation
  const markAsInternal = useCallback(() => {
    sessionStorage.setItem(ENTRY_SOURCE_KEY, "internal");
    setEntrySource("internal");
  }, []);

  // Mark current session as career flow (immersive mode)
  const markAsCareerFlow = useCallback(() => {
    sessionStorage.setItem(ENTRY_FLOW_KEY, "career_flow");
    setEntryFlow("career_flow");
  }, []);

  // Clear career flow and return to global mode
  const clearCareerFlow = useCallback(() => {
    sessionStorage.removeItem(ENTRY_FLOW_KEY);
    setEntryFlow("global");
  }, []);

  const isLoading = authLoading || subscriptionLoading;

  return {
    userState,
    entrySource,
    entryFlow,
    subscription,
    isLoading,
    isGuest,
    isLearner,
    isPro,
    shouldShowAds,
    shouldShowProFeatures,
    isCareerFlow,
    markAsInternal,
    markAsCareerFlow,
    clearCareerFlow,
  };
};

export default useUserState;
