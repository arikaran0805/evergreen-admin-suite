import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_visible: boolean;
}

export interface FunctionParameter {
  id: string;
  name: string;
  type: string;
}

export interface FunctionSignature {
  name: string;
  parameters: FunctionParameter[];
  return_type: string;
}

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
  // LeetCode-critical fields
  test_cases: TestCase[];
  input_format: string;
  output_format: string;
  time_limit: number;
  memory_limit: number;
  supported_languages: string[];
  function_signature: FunctionSignature;
  tags: string[];
}

// Helper to transform DB row to PracticeProblem
function transformProblem(row: any): PracticeProblem {
  return {
    ...row,
    test_cases: (row.test_cases || []) as TestCase[],
    function_signature: (row.function_signature || { name: "solution", parameters: [], return_type: "int" }) as FunctionSignature,
    supported_languages: (row.supported_languages || ["python", "javascript"]) as string[],
    tags: (row.tags || []) as string[],
    constraints: (row.constraints || []) as string[],
    hints: (row.hints || []) as string[],
    examples: (row.examples || []) as any[],
    starter_code: (row.starter_code || {}) as Record<string, string>,
  };
}

export function usePracticeProblems(skillId: string | undefined) {
  return useQuery({
    queryKey: ["practice-problems", skillId],
    queryFn: async () => {
      if (!skillId) return [];

      // Get problems directly linked via skill_id
      const { data: directProblems, error: directError } = await supabase
        .from("practice_problems")
        .select("*")
        .eq("skill_id", skillId)
        .order("display_order", { ascending: true });

      if (directError) throw directError;

      // Get problems mapped to sub-topics that belong to this skill
      const { data: mappedBySkill } = await supabase
        .from("problem_mappings")
        .select(`
          problem_id,
          practice_problems!inner(*),
          sub_topics!inner(skill_id)
        `)
        .eq("sub_topics.skill_id", skillId);

      // Merge and deduplicate
      const allProblems = [...(directProblems || [])];
      const existingIds = new Set(allProblems.map(p => p.id));
      
      if (mappedBySkill) {
        for (const mapping of mappedBySkill) {
          const problem = mapping.practice_problems;
          if (!existingIds.has(problem.id)) {
            allProblems.push(problem);
            existingIds.add(problem.id);
          }
        }
      }

      return allProblems.map(transformProblem);
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
      return transformProblem(data);
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

      // Get problems directly linked via skill_id
      const { data: directProblems, error } = await supabase
        .from("practice_problems")
        .select("*")
        .eq("skill_id", skill.id)
        .eq("status", "published")
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Get problems mapped to sub-topics that belong to this skill
      const { data: mappedBySkill } = await supabase
        .from("problem_mappings")
        .select(`
          problem_id,
          practice_problems!inner(*)
        `)
        .eq("practice_problems.status", "published");

      // Filter mapped problems by checking if sub_topic belongs to this skill
      const { data: skillSubTopics } = await supabase
        .from("sub_topics")
        .select("id")
        .eq("skill_id", skill.id);

      const subTopicIds = new Set((skillSubTopics || []).map(st => st.id));

      // Get mappings for these sub-topics
      const { data: relevantMappings } = await supabase
        .from("problem_mappings")
        .select(`
          problem_id,
          sub_topic_id,
          practice_problems!inner(*)
        `)
        .eq("practice_problems.status", "published");

      // Merge and deduplicate
      const allProblems = [...(directProblems || [])];
      const existingIds = new Set(allProblems.map(p => p.id));
      
      if (relevantMappings) {
        for (const mapping of relevantMappings) {
          if (subTopicIds.has(mapping.sub_topic_id)) {
            const problem = mapping.practice_problems;
            if (!existingIds.has(problem.id)) {
              allProblems.push(problem);
              existingIds.add(problem.id);
            }
          }
        }
      }

      return allProblems.map(transformProblem);
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
      return transformProblem(data);
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
      // LeetCode-critical fields
      test_cases?: TestCase[];
      input_format?: string;
      output_format?: string;
      time_limit?: number;
      memory_limit?: number;
      supported_languages?: string[];
      function_signature?: FunctionSignature;
      tags?: string[];
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
          // LeetCode-critical fields
          test_cases: (problem.test_cases || []) as unknown as any,
          input_format: problem.input_format || "",
          output_format: problem.output_format || "",
          time_limit: problem.time_limit || 1000,
          memory_limit: problem.memory_limit || 256,
          supported_languages: problem.supported_languages || ["python", "javascript"],
          function_signature: (problem.function_signature || { name: "solution", parameters: [], return_type: "int" }) as unknown as any,
          tags: problem.tags || [],
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
    mutationFn: async ({ id, ...updates }: {
      id: string;
      title?: string;
      slug?: string;
      difficulty?: "Easy" | "Medium" | "Hard";
      sub_topic?: string;
      description?: string;
      examples?: any[];
      constraints?: string[];
      hints?: string[];
      starter_code?: Record<string, string>;
      solution?: string;
      is_premium?: boolean;
      display_order?: number;
      status?: string;
      test_cases?: TestCase[];
      input_format?: string;
      output_format?: string;
      time_limit?: number;
      memory_limit?: number;
      supported_languages?: string[];
      function_signature?: FunctionSignature;
      tags?: string[];
    }) => {
      // Build update object, converting complex types
      const updatePayload: Record<string, any> = {};
      
      if (updates.title !== undefined) updatePayload.title = updates.title;
      if (updates.slug !== undefined) updatePayload.slug = updates.slug;
      if (updates.difficulty !== undefined) updatePayload.difficulty = updates.difficulty;
      if (updates.sub_topic !== undefined) updatePayload.sub_topic = updates.sub_topic;
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.examples !== undefined) updatePayload.examples = updates.examples;
      if (updates.constraints !== undefined) updatePayload.constraints = updates.constraints;
      if (updates.hints !== undefined) updatePayload.hints = updates.hints;
      if (updates.starter_code !== undefined) updatePayload.starter_code = updates.starter_code;
      if (updates.solution !== undefined) updatePayload.solution = updates.solution;
      if (updates.is_premium !== undefined) updatePayload.is_premium = updates.is_premium;
      if (updates.display_order !== undefined) updatePayload.display_order = updates.display_order;
      if (updates.status !== undefined) updatePayload.status = updates.status;
      if (updates.test_cases !== undefined) updatePayload.test_cases = updates.test_cases;
      if (updates.input_format !== undefined) updatePayload.input_format = updates.input_format;
      if (updates.output_format !== undefined) updatePayload.output_format = updates.output_format;
      if (updates.time_limit !== undefined) updatePayload.time_limit = updates.time_limit;
      if (updates.memory_limit !== undefined) updatePayload.memory_limit = updates.memory_limit;
      if (updates.supported_languages !== undefined) updatePayload.supported_languages = updates.supported_languages;
      if (updates.function_signature !== undefined) updatePayload.function_signature = updates.function_signature;
      if (updates.tags !== undefined) updatePayload.tags = updates.tags;

      const { data, error } = await supabase
        .from("practice_problems")
        .update(updatePayload)
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
