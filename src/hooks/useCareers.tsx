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
  weight: number;
  icon: string;
  color: string;
}

export interface SkillContribution {
  skill_name: string;
  contribution: number; // 0-100 percentage
}

export interface CareerCourse {
  id: string;
  career_id: string;
  course_id: string;
  skill_contributions: SkillContribution[];
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
          skillsByCareer[skill.career_id].push({
            ...skill,
            weight: skill.weight || 25,
            icon: skill.icon || 'Code2',
            color: skill.color || 'Emerald',
          });
        });
        setCareerSkills(skillsByCareer);
      }

      if (coursesRes.data) {
        const coursesByCareer: Record<string, CareerCourse[]> = {};
        coursesRes.data.forEach(cc => {
          if (!coursesByCareer[cc.career_id]) {
            coursesByCareer[cc.career_id] = [];
          }
          // Parse skill_contributions from JSON
          const skillContributions = Array.isArray(cc.skill_contributions) 
            ? (cc.skill_contributions as unknown as SkillContribution[])
            : [];
          coursesByCareer[cc.career_id].push({
            id: cc.id,
            career_id: cc.career_id,
            course_id: cc.course_id,
            skill_contributions: skillContributions,
            course: cc.course,
          });
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

  const getSkillContributionsForCourse = (careerId: string, courseSlug: string): SkillContribution[] => {
    const careerCourse = careerCourses[careerId]?.find(cc => cc.course?.slug === courseSlug);
    return careerCourse?.skill_contributions || [];
  };

  const getCareerCourses = (careerId: string) => {
    return careerCourses[careerId] || [];
  };

  // Get the first course that contributes to a specific skill
  const getCourseForSkill = (careerId: string, skillName: string): { courseSlug: string; courseId: string } | null => {
    const courses = careerCourses[careerId] || [];
    for (const cc of courses) {
      const contributions = cc.skill_contributions || [];
      const hasSkill = contributions.some(c => 
        c.skill_name.toLowerCase() === skillName.toLowerCase()
      );
      if (hasSkill && cc.course?.slug) {
        return { courseSlug: cc.course.slug, courseId: cc.course.id };
      }
    }
    // If no specific contribution found, return the first course in the career path
    if (courses.length > 0 && courses[0].course?.slug) {
      return { courseSlug: courses[0].course.slug, courseId: courses[0].course.id };
    }
    return null;
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
    getSkillContributionsForCourse,
    getCareerCourses,
    getCourseForSkill,
    refetch: fetchCareers,
  };
};
