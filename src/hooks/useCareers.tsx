import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Career {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  display_order: number;
}

export interface CareerSkill {
  id: string;
  career_id: string;
  skill_name: string;
  display_order: number;
}

export interface CareerCourse {
  id: string;
  career_id: string;
  course_id: string;
  course?: {
    id: string;
    name: string;
    slug: string;
  };
}

export const useCareers = () => {
  const [careers, setCareers] = useState<Career[]>([]);
  const [careerSkills, setCareerSkills] = useState<Record<string, CareerSkill[]>>({});
  const [careerCourses, setCareerCourses] = useState<Record<string, CareerCourse[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCareers();
  }, []);

  const fetchCareers = async () => {
    try {
      const [careersRes, skillsRes, coursesRes] = await Promise.all([
        supabase.from("careers").select("*").order("display_order"),
        supabase.from("career_skills").select("*").order("display_order"),
        supabase.from("career_courses").select("*, course:course_id(id, name, slug)"),
      ]);

      if (careersRes.data) {
        setCareers(careersRes.data);
      }

      if (skillsRes.data) {
        const skillsByCareer: Record<string, CareerSkill[]> = {};
        skillsRes.data.forEach(skill => {
          if (!skillsByCareer[skill.career_id]) {
            skillsByCareer[skill.career_id] = [];
          }
          skillsByCareer[skill.career_id].push(skill);
        });
        setCareerSkills(skillsByCareer);
      }

      if (coursesRes.data) {
        const coursesByCareer: Record<string, CareerCourse[]> = {};
        coursesRes.data.forEach(cc => {
          if (!coursesByCareer[cc.career_id]) {
            coursesByCareer[cc.career_id] = [];
          }
          coursesByCareer[cc.career_id].push(cc);
        });
        setCareerCourses(coursesByCareer);
      }
    } catch (error) {
      console.error("Error fetching careers:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCareerBySlug = (slug: string) => {
    return careers.find(c => c.slug === slug);
  };

  const getCareerById = (id: string) => {
    return careers.find(c => c.id === id);
  };

  const getCareerSkills = (careerId: string) => {
    return careerSkills[careerId] || [];
  };

  const getCareerCourseSlugs = (careerId: string) => {
    return careerCourses[careerId]?.map(cc => cc.course?.slug).filter(Boolean) as string[] || [];
  };

  return {
    careers,
    careerSkills,
    careerCourses,
    loading,
    getCareerBySlug,
    getCareerById,
    getCareerSkills,
    getCareerCourseSlugs,
    refetch: fetchCareers,
  };
};
