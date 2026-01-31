import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SubTopic {
  id: string;
  lesson_id: string;
  skill_id: string;
  title: string;
  description: string | null;
  display_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  problem_count?: number;
}

export function useSubTopicsByLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["sub-topics", "lesson", lessonId],
    queryFn: async () => {
      if (!lessonId) return [];
      const { data, error } = await supabase
        .from("sub_topics")
        .select("*, problem_mappings(count)")
        .eq("lesson_id", lessonId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data || []).map((st: any) => ({
        ...st,
        problem_count: st.problem_mappings?.[0]?.count || 0,
      })) as SubTopic[];
    },
    enabled: !!lessonId,
  });
}

export function useSubTopicsBySkill(skillId: string | undefined) {
  return useQuery({
    queryKey: ["sub-topics", "skill", skillId],
    queryFn: async () => {
      if (!skillId) return [];
      const { data, error } = await supabase
        .from("sub_topics")
        .select("*, problem_mappings(count), course_lessons(title, course_id)")
        .eq("skill_id", skillId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data || []).map((st: any) => ({
        ...st,
        problem_count: st.problem_mappings?.[0]?.count || 0,
        lesson_title: st.course_lessons?.title,
        course_id: st.course_lessons?.course_id,
      })) as (SubTopic & { lesson_title?: string; course_id?: string })[];
    },
    enabled: !!skillId,
  });
}

export function useCreateSubTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subTopic: {
      lesson_id: string;
      skill_id: string;
      title: string;
      description?: string;
      display_order?: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("sub_topics")
        .insert({
          lesson_id: subTopic.lesson_id,
          skill_id: subTopic.skill_id,
          title: subTopic.title,
          description: subTopic.description,
          display_order: subTopic.display_order || 0,
          is_default: false,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sub-topics", "lesson", data.lesson_id] });
      queryClient.invalidateQueries({ queryKey: ["sub-topics", "skill", data.skill_id] });
      toast.success("Sub-topic created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create sub-topic: ${error.message}`);
    },
  });
}

export function useUpdateSubTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SubTopic> & { id: string }) => {
      const { data, error } = await supabase
        .from("sub_topics")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sub-topics", "lesson", data.lesson_id] });
      queryClient.invalidateQueries({ queryKey: ["sub-topics", "skill", data.skill_id] });
      toast.success("Sub-topic updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update sub-topic: ${error.message}`);
    },
  });
}

export function useDeleteSubTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, lessonId, skillId }: { id: string; lessonId: string; skillId: string }) => {
      const { error } = await supabase
        .from("sub_topics")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { lessonId, skillId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sub-topics", "lesson", data.lessonId] });
      queryClient.invalidateQueries({ queryKey: ["sub-topics", "skill", data.skillId] });
      toast.success("Sub-topic deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete sub-topic: ${error.message}`);
    },
  });
}
