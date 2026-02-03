import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ReactionCounts {
  likes: number;
  dislikes: number;
}

export function useProblemReactions(problemId: string | undefined) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<ReactionCounts>({ likes: 0, dislikes: 0 });
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch counts and user reaction
  useEffect(() => {
    if (!problemId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all reactions for this problem
        const { data: reactions, error } = await supabase
          .from("problem_reactions")
          .select("reaction_type, user_id")
          .eq("problem_id", problemId);

        if (error) throw error;

        // Count likes and dislikes
        let likes = 0;
        let dislikes = 0;
        let currentUserReaction: "like" | "dislike" | null = null;

        reactions?.forEach((r) => {
          if (r.reaction_type === "like") likes++;
          if (r.reaction_type === "dislike") dislikes++;
          if (user && r.user_id === user.id) {
            currentUserReaction = r.reaction_type as "like" | "dislike";
          }
        });

        setCounts({ likes, dislikes });
        setUserReaction(currentUserReaction);
      } catch (err) {
        console.error("Error fetching problem reactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [problemId, user]);

  const react = useCallback(
    async (type: "like" | "dislike") => {
      if (!problemId || !user) return;

      const previousReaction = userReaction;
      const previousCounts = { ...counts };

      // Optimistic update
      if (userReaction === type) {
        // Remove reaction
        setUserReaction(null);
        setCounts((prev) => ({
          ...prev,
          [type === "like" ? "likes" : "dislikes"]: Math.max(0, prev[type === "like" ? "likes" : "dislikes"] - 1),
        }));
      } else {
        // Add or change reaction
        setUserReaction(type);
        setCounts((prev) => {
          const newCounts = { ...prev };
          // Add new reaction
          newCounts[type === "like" ? "likes" : "dislikes"]++;
          // Remove old reaction if exists
          if (previousReaction) {
            newCounts[previousReaction === "like" ? "likes" : "dislikes"] = Math.max(
              0,
              newCounts[previousReaction === "like" ? "likes" : "dislikes"] - 1
            );
          }
          return newCounts;
        });
      }

      try {
        if (userReaction === type) {
          // Remove reaction
          await supabase
            .from("problem_reactions")
            .delete()
            .eq("problem_id", problemId)
            .eq("user_id", user.id);
        } else if (previousReaction) {
          // Update reaction
          await supabase
            .from("problem_reactions")
            .update({ reaction_type: type })
            .eq("problem_id", problemId)
            .eq("user_id", user.id);
        } else {
          // Insert new reaction
          await supabase.from("problem_reactions").insert({
            problem_id: problemId,
            user_id: user.id,
            reaction_type: type,
          });
        }
      } catch (err) {
        console.error("Error updating reaction:", err);
        // Rollback on error
        setUserReaction(previousReaction);
        setCounts(previousCounts);
      }
    },
    [problemId, user, userReaction, counts]
  );

  return useMemo(
    () => ({
      likes: counts.likes,
      dislikes: counts.dislikes,
      userReaction,
      loading,
      react,
      isAuthenticated: !!user,
    }),
    [counts, userReaction, loading, react, user]
  );
}
