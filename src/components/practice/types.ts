// Display types for UI components (can be from DB or mock data)
export interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  solved: boolean;
  locked: boolean;
  subTopic: string;
  hasSolution: boolean;
  slug?: string;
}

export interface SkillData {
  id: string;
  name: string;
  description: string;
  problems: Problem[];
}

export type DifficultyFilter = 'all' | 'Easy' | 'Medium' | 'Hard';
export type StatusFilter = 'all' | 'solved' | 'unsolved';
