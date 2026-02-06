import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PredictOutputAttempt {
  id: string;
  user_id: string;
  problem_id: string;
  user_output: string;
  is_correct: boolean;
  revealed: boolean;
  attempt_no: number;
  score_awarded: number;
  time_taken: number | null;
  created_at: string;
}

export function usePredictOutputAttempts(problemId: string | undefined) {
  return useQuery({
    queryKey: ["predict-output-attempts", problemId],
    queryFn: async () => {
      if (!problemId) return [];
      const { data, error } = await supabase
        .from("predict_output_attempts")
        .select("*")
        .eq("problem_id", problemId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as PredictOutputAttempt[];
    },
    enabled: !!problemId,
  });
}

export function useSubmitPredictOutputAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      problem_id: string;
      user_output: string;
      is_correct: boolean;
      revealed: boolean;
      attempt_no: number;
      score_awarded: number;
      time_taken?: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("predict_output_attempts")
        .insert({
          user_id: userData.user.id,
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PredictOutputAttempt;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["predict-output-attempts", data.problem_id] });
    },
  });
}
