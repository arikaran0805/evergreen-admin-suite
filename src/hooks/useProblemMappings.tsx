import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProblemMapping {
  id: string;
  problem_id: string;
  sub_topic_id: string;
  display_order: number;
  context_note: string | null;
  created_at: string;
  created_by: string | null;
  // Joined fields
  problem?: {
    id: string;
    title: string;
    difficulty: string;
    status: string;
  };
}

export function useProblemMappingsBySubTopic(subTopicId: string | undefined) {
  return useQuery({
    queryKey: ["problem-mappings", "sub-topic", subTopicId],
    queryFn: async () => {
      if (!subTopicId) return [];
      const { data, error } = await supabase
        .from("problem_mappings")
        .select(`
          *,
          practice_problems!problem_id (
            id, title, difficulty, status, slug
          )
        `)
        .eq("sub_topic_id", subTopicId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data || []).map((pm: any) => ({
        ...pm,
        problem: pm.practice_problems,
      })) as ProblemMapping[];
    },
    enabled: !!subTopicId,
  });
}

export function useProblemMappingsByProblem(problemId: string | undefined) {
  return useQuery({
    queryKey: ["problem-mappings", "problem", problemId],
    queryFn: async () => {
      if (!problemId) return [];
      const { data, error } = await supabase
        .from("problem_mappings")
        .select(`
          *,
          sub_topics!sub_topic_id (
            id, title, lesson_id, skill_id
          )
        `)
        .eq("problem_id", problemId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!problemId,
  });
}

export function useAllGlobalProblems() {
  return useQuery({
    queryKey: ["global-problems"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_problems")
        .select("id, title, slug, difficulty, status, sub_topic")
        .order("title", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateProblemMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mapping: {
      problem_id: string;
      sub_topic_id: string;
      display_order?: number;
      context_note?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("problem_mappings")
        .insert({
          problem_id: mapping.problem_id,
          sub_topic_id: mapping.sub_topic_id,
          display_order: mapping.display_order || 0,
          context_note: mapping.context_note,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["problem-mappings", "sub-topic", data.sub_topic_id] });
      queryClient.invalidateQueries({ queryKey: ["problem-mappings", "problem", data.problem_id] });
      queryClient.invalidateQueries({ queryKey: ["sub-topics"] });
      toast.success("Problem attached successfully");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("This problem is already attached to this sub-topic");
      } else {
        toast.error(`Failed to attach problem: ${error.message}`);
      }
    },
  });
}

export function useUpdateProblemMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProblemMapping> & { id: string }) => {
      const { data, error } = await supabase
        .from("problem_mappings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["problem-mappings", "sub-topic", data.sub_topic_id] });
      toast.success("Mapping updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update mapping: ${error.message}`);
    },
  });
}

export function useDeleteProblemMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, subTopicId, problemId }: { id: string; subTopicId: string; problemId: string }) => {
      const { error } = await supabase
        .from("problem_mappings")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { subTopicId, problemId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["problem-mappings", "sub-topic", data.subTopicId] });
      queryClient.invalidateQueries({ queryKey: ["problem-mappings", "problem", data.problemId] });
      queryClient.invalidateQueries({ queryKey: ["sub-topics"] });
      toast.success("Problem detached successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to detach problem: ${error.message}`);
    },
  });
}
