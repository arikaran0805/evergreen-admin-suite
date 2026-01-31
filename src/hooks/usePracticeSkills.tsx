import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PracticeSkill {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  display_order: number;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  problem_count?: number;
}

export function usePracticeSkills() {
  return useQuery({
    queryKey: ["practice-skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_skills")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PracticeSkill[];
    },
  });
}

export function usePracticeSkill(id: string | undefined) {
  return useQuery({
    queryKey: ["practice-skill", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("practice_skills")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as PracticeSkill;
    },
    enabled: !!id,
  });
}

export function usePublishedPracticeSkills() {
  return useQuery({
    queryKey: ["published-practice-skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_skills")
        .select("*")
        .eq("status", "published")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PracticeSkill[];
    },
  });
}

export function useCreatePracticeSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skill: {
      name: string;
      slug: string;
      description?: string;
      icon?: string;
      display_order?: number;
      status?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("practice_skills")
        .insert({
          name: skill.name,
          slug: skill.slug,
          description: skill.description,
          icon: skill.icon || "Code2",
          display_order: skill.display_order || 0,
          status: skill.status || "draft",
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-skills"] });
      toast.success("Practice skill created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create skill: ${error.message}`);
    },
  });
}

export function useUpdatePracticeSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PracticeSkill> & { id: string }) => {
      const { data, error } = await supabase
        .from("practice_skills")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["practice-skills"] });
      queryClient.invalidateQueries({ queryKey: ["practice-skill", variables.id] });
      toast.success("Practice skill updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update skill: ${error.message}`);
    },
  });
}

export function useDeletePracticeSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("practice_skills")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-skills"] });
      toast.success("Practice skill deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete skill: ${error.message}`);
    },
  });
}
