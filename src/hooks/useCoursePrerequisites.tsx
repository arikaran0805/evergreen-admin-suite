import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Prerequisite {
  id?: string;
  prerequisite_course_id: string | null;
  prerequisite_text: string | null;
  display_order: number;
  linkedCourse?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function useCoursePrerequisites(courseId?: string) {
  const [prerequisites, setPrerequisites] = useState<Prerequisite[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPrerequisites = useCallback(async () => {
    if (!courseId) {
      setPrerequisites([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("course_prerequisites")
        .select(`
          id,
          prerequisite_course_id,
          prerequisite_text,
          display_order
        `)
        .eq("course_id", courseId)
        .order("display_order");

      if (error) throw error;

      // Fetch linked course details
      const courseIds = (data || [])
        .filter(p => p.prerequisite_course_id)
        .map(p => p.prerequisite_course_id);

      let coursesMap: Record<string, { id: string; name: string; slug: string }> = {};
      
      if (courseIds.length > 0) {
        const { data: courses, error: coursesError } = await supabase
          .from("courses")
          .select("id, name, slug")
          .in("id", courseIds);

        if (!coursesError && courses) {
          coursesMap = Object.fromEntries(courses.map(c => [c.id, c]));
        }
      }

      const enrichedPrereqs: Prerequisite[] = (data || []).map(p => ({
        id: p.id,
        prerequisite_course_id: p.prerequisite_course_id,
        prerequisite_text: p.prerequisite_text,
        display_order: p.display_order,
        linkedCourse: p.prerequisite_course_id ? coursesMap[p.prerequisite_course_id] || null : null,
      }));

      setPrerequisites(enrichedPrereqs);
    } catch (error: any) {
      console.error("Error fetching prerequisites:", error);
      toast({
        title: "Error loading prerequisites",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  const savePrerequisites = async (newPrerequisites: Prerequisite[]) => {
    if (!courseId) return;

    try {
      // Delete existing prerequisites
      const { error: deleteError } = await supabase
        .from("course_prerequisites")
        .delete()
        .eq("course_id", courseId);

      if (deleteError) throw deleteError;

      // Insert new prerequisites (filter out incomplete ones)
      const validPrereqs = newPrerequisites.filter(p => 
        (p.prerequisite_course_id && p.prerequisite_course_id.length > 0) || 
        (p.prerequisite_text && p.prerequisite_text.trim().length > 0)
      );

      if (validPrereqs.length > 0) {
        const { error: insertError } = await supabase
          .from("course_prerequisites")
          .insert(
            validPrereqs.map((p, index) => ({
              course_id: courseId,
              prerequisite_course_id: p.prerequisite_course_id || null,
              prerequisite_text: p.prerequisite_text || null,
              display_order: index,
            }))
          );

        if (insertError) throw insertError;
      }

      await fetchPrerequisites();
    } catch (error: any) {
      console.error("Error saving prerequisites:", error);
      toast({
        title: "Error saving prerequisites",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchPrerequisites();
  }, [fetchPrerequisites]);

  return {
    prerequisites,
    setPrerequisites,
    loading,
    fetchPrerequisites,
    savePrerequisites,
  };
}
