import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LessonProblemCount {
  lessonId: string;
  problemCount: number;
}

/**
 * Hook to get the practice skill linked to a course
 */
export function usePracticeSkillByCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ["practice-skill-by-course", courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      const { data, error } = await supabase
        .from("practice_skills")
        .select("id, slug, name, status")
        .eq("course_id", courseId)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
}

/**
 * Hook to get problem counts grouped by lesson for a course
 * Returns a map of lessonId -> problemCount
 */
export function useLessonProblemCounts(courseId: string | undefined) {
  return useQuery({
    queryKey: ["lesson-problem-counts", courseId],
    queryFn: async () => {
      if (!courseId) return new Map<string, number>();

      // First get the practice skill for this course
      const { data: skill } = await supabase
        .from("practice_skills")
        .select("id")
        .eq("course_id", courseId)
        .eq("status", "published")
        .maybeSingle();

      if (!skill) return new Map<string, number>();

      // Get sub-topics for this skill with their problem counts
      const { data: subTopics, error } = await supabase
        .from("sub_topics")
        .select("lesson_id, problem_mappings(count)")
        .eq("skill_id", skill.id);

      if (error) throw error;

      // Aggregate problem counts by lesson
      const countMap = new Map<string, number>();
      
      (subTopics || []).forEach((st: any) => {
        const lessonId = st.lesson_id;
        const problemCount = st.problem_mappings?.[0]?.count || 0;
        
        if (lessonId && problemCount > 0) {
          countMap.set(lessonId, (countMap.get(lessonId) || 0) + problemCount);
        }
      });

      return countMap;
    },
    enabled: !!courseId,
  });
}
