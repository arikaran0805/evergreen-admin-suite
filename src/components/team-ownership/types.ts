import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface Career {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string;
  status: string;
}

export interface Course {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  status: string;
}

export interface Team {
  id: string;
  name: string;
  career_id: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  career: Career | null;
  superModeratorCount: number;
  courseCount: number;
  seniorModeratorCount: number;
  moderatorCount: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface SuperModeratorAssignment {
  id: string;
  user_id: string;
  career_id: string;
  team_id: string | null;
  assigned_at: string;
  user?: UserProfile;
}

export interface CourseAssignment {
  id: string;
  user_id: string;
  course_id: string;
  team_id: string | null;
  role: AppRole;
  is_default_manager: boolean;
  assigned_at: string;
  user?: UserProfile;
  course?: Course;
}

export interface TeamCanvasData {
  team: Team;
  superModerators: SuperModeratorAssignment[];
  courses: CourseWithAssignments[];
}

export interface CourseWithAssignments extends Course {
  career_id: string;
  seniorModerators: CourseAssignment[];
  moderators: CourseAssignment[];
}
