import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseCareerWelcomeReturn {
  hasSeenWelcome: boolean | null;
  loading: boolean;
  markWelcomeSeen: () => Promise<void>;
}

/**
 * Hook to track whether a user has seen the career welcome page for a specific career.
 * Returns null while loading, true if seen, false if not seen.
 */
export const useCareerWelcome = (careerId: string | undefined): UseCareerWelcomeReturn => {
  const { user } = useAuth();
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkWelcomeSeen = async () => {
      if (!user?.id || !careerId) {
        setLoading(false);
        setHasSeenWelcome(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("career_welcome_views")
          .select("id")
          .eq("user_id", user.id)
          .eq("career_id", careerId)
          .maybeSingle();

        if (error) {
          console.error("Error checking career welcome view:", error);
          setHasSeenWelcome(true); // Default to seen on error to avoid blocking
        } else {
          setHasSeenWelcome(!!data);
        }
      } catch (err) {
        console.error("Error checking career welcome view:", err);
        setHasSeenWelcome(true);
      } finally {
        setLoading(false);
      }
    };

    checkWelcomeSeen();
  }, [user?.id, careerId]);

  const markWelcomeSeen = useCallback(async () => {
    if (!user?.id || !careerId) return;

    try {
      const { error } = await supabase
        .from("career_welcome_views")
        .insert({
          user_id: user.id,
          career_id: careerId,
        });

      if (error && !error.message.includes("duplicate")) {
        console.error("Error marking career welcome as seen:", error);
      }
      
      setHasSeenWelcome(true);
    } catch (err) {
      console.error("Error marking career welcome as seen:", err);
      // Still set as seen to prevent blocking
      setHasSeenWelcome(true);
    }
  }, [user?.id, careerId]);

  return { hasSeenWelcome, loading, markWelcomeSeen };
};
