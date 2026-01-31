import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PracticeProblem {
  id: string;
  skill_id: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  sub_topic: string;
  description: string | null;
  examples: any[];
  constraints: string[];
  hints: string[];
  starter_code: Record<string, string>;
  solution: string | null;
  is_premium: boolean;
  display_order: number;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function usePracticeProblems(skillId: string | undefined) {
  return useQuery({
    queryKey: ["practice-problems", skillId],
    queryFn: async () => {
      if (!skillId) return [];
      const { data, error } = await supabase
        .from("practice_problems")
        .select("*")
        .eq("skill_id", skillId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PracticeProblem[];
    },
    enabled: !!skillId,
  });
}

export function usePracticeProblem(id: string | undefined) {
  return useQuery({
    queryKey: ["practice-problem", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("practice_problems")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as PracticeProblem;
    },
    enabled: !!id,
  });
}

export function usePublishedPracticeProblems(skillSlug: string | undefined) {
  return useQuery({
    queryKey: ["published-practice-problems", skillSlug],
    queryFn: async () => {
      if (!skillSlug) return [];
      
      // First get the skill by slug
      const { data: skill, error: skillError } = await supabase
        .from("practice_skills")
        .select("id")
        .eq("slug", skillSlug)
        .eq("status", "published")
        .single();

      if (skillError || !skill) return [];

      const { data, error } = await supabase
        .from("practice_problems")
        .select("*")
        .eq("skill_id", skill.id)
        .eq("status", "published")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PracticeProblem[];
    },
    enabled: !!skillSlug,
  });
}

export function usePublishedPracticeProblem(skillSlug: string | undefined, problemSlug: string | undefined) {
  return useQuery({
    queryKey: ["published-practice-problem", skillSlug, problemSlug],
    queryFn: async () => {
      if (!skillSlug || !problemSlug) return null;
      
      // First get the skill by slug
      const { data: skill, error: skillError } = await supabase
        .from("practice_skills")
        .select("id")
        .eq("slug", skillSlug)
        .eq("status", "published")
        .single();

      if (skillError || !skill) return null;

      const { data, error } = await supabase
        .from("practice_problems")
        .select("*")
        .eq("skill_id", skill.id)
        .eq("slug", problemSlug)
        .eq("status", "published")
        .single();

      if (error) return null;
      return data as PracticeProblem;
    },
    enabled: !!skillSlug && !!problemSlug,
  });
}

export function useCreatePracticeProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (problem: {
      skill_id?: string;
      title: string;
      slug: string;
      difficulty: "Easy" | "Medium" | "Hard";
      sub_topic: string;
      description?: string;
      examples?: any[];
      constraints?: string[];
      hints?: string[];
      starter_code?: Record<string, string>;
      solution?: string;
      is_premium?: boolean;
      display_order?: number;
      status?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("practice_problems")
        .insert({
          skill_id: problem.skill_id!,
          title: problem.title,
          slug: problem.slug,
          difficulty: problem.difficulty,
          sub_topic: problem.sub_topic,
          description: problem.description,
          examples: problem.examples || [],
          constraints: problem.constraints || [],
          hints: problem.hints || [],
          starter_code: problem.starter_code || {},
          solution: problem.solution,
          is_premium: problem.is_premium || false,
          display_order: problem.display_order || 0,
          status: problem.status || "draft",
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["practice-problems", data.skill_id] });
      toast.success("Problem created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create problem: ${error.message}`);
    },
  });
}

export function useUpdatePracticeProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PracticeProblem> & { id: string }) => {
      const { data, error } = await supabase
        .from("practice_problems")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["practice-problems", data.skill_id] });
      queryClient.invalidateQueries({ queryKey: ["practice-problem", variables.id] });
      toast.success("Problem updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update problem: ${error.message}`);
    },
  });
}

export function useDeletePracticeProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, skillId }: { id: string; skillId: string }) => {
      const { error } = await supabase
        .from("practice_problems")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { skillId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["practice-problems", data.skillId] });
      toast.success("Problem deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete problem: ${error.message}`);
    },
  });
}
