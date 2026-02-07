import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FixErrorMapping {
  id: string;
  fix_error_problem_id: string;
  sub_topic_id: string;
  display_order: number;
  context_note: string | null;
  created_at: string;
  created_by: string | null;
}

export function useFixErrorMappingsBySkill(
  skillId: string | undefined,
  subTopicIds: string[]
) {
  return useQuery({
    queryKey: ["fix-error-mappings-by-skill", skillId, subTopicIds],
    queryFn: async () => {
      if (!skillId || subTopicIds.length === 0) return [];
      const { data, error } = await supabase
        .from("fix_error_mappings")
        .select("*, fix_error_problems(*)")
        .in("sub_topic_id", subTopicIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!skillId && subTopicIds.length > 0,
  });
}

export function useCreateFixErrorMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mapping: {
      fix_error_problem_id: string;
      sub_topic_id: string;
      display_order?: number;
      context_note?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("fix_error_mappings")
        .insert({
          fix_error_problem_id: mapping.fix_error_problem_id,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fix-error-mappings-by-skill"] });
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

export function useDeleteFixErrorMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; subTopicId: string; problemId: string }) => {
      const { error } = await supabase
        .from("fix_error_mappings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fix-error-mappings-by-skill"] });
      queryClient.invalidateQueries({ queryKey: ["sub-topics"] });
      toast.success("Problem detached successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to detach problem: ${error.message}`);
    },
  });
}
