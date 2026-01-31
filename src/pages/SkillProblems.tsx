import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProblemFilters } from "@/components/practice/ProblemFilters";
import { LessonProblemSection } from "@/components/practice/LessonProblemSection";
import { usePublishedPracticeProblems, ProblemWithMapping } from "@/hooks/usePracticeProblems";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DifficultyFilter = 'all' | 'Easy' | 'Medium' | 'Hard';
type StatusFilter = 'all' | 'solved' | 'unsolved';

// Convert database problem to display format
interface DisplayProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  solved: boolean;
  locked: boolean;
  subTopic: string;
  hasSolution: boolean;
  slug: string;
  lessonId?: string;
  lessonTitle?: string;
  subTopicId?: string;
  subTopicTitle?: string;
}

export default function SkillProblems() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  // Fetch skill info
  const { data: skill, isLoading: skillLoading } = useQuery({
    queryKey: ["skill-by-slug", skillId],
    queryFn: async () => {
      if (!skillId) return null;
      const { data, error } = await supabase
        .from("practice_skills")
        .select("*")
        .eq("slug", skillId)
        .eq("status", "published")
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!skillId,
  });

  // Fetch problems with lesson/sub-topic info
  const { data: problems, isLoading: problemsLoading } = usePublishedPracticeProblems(skillId);

  // Convert to display format
  const displayProblems: DisplayProblem[] = useMemo(() => {
    if (!problems) return [];
    return problems.map((p: ProblemWithMapping) => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      solved: false, // TODO: Track user progress
      locked: p.is_premium,
      subTopic: p.sub_topic,
      hasSolution: !!p.solution,
      slug: p.slug,
      lessonId: p.lesson_id,
      lessonTitle: p.lesson_title,
      subTopicId: p.sub_topic_id,
      subTopicTitle: p.sub_topic_title,
    }));
  }, [problems]);

  // Filter problems
  const filteredProblems = useMemo(() => {
    return displayProblems.filter((p) => {
      if (difficulty !== 'all' && p.difficulty !== difficulty) return false;
      if (status === 'solved' && !p.solved) return false;
      if (status === 'unsolved' && p.solved) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [displayProblems, difficulty, status, search]);

  // Group problems by lesson > sub-topic hierarchy
  const groupedByLesson = useMemo(() => {
    const lessons: Record<string, {
      lessonId?: string;
      lessonTitle: string;
      subTopics: Record<string, DisplayProblem[]>;
    }> = {};
    
    filteredProblems.forEach((p) => {
      const lessonKey = p.lessonId || p.lessonTitle || "General";
      const subTopicKey = p.subTopicTitle || p.subTopic || "Uncategorized";
      
      if (!lessons[lessonKey]) {
        lessons[lessonKey] = {
          lessonId: p.lessonId,
          lessonTitle: p.lessonTitle || "General",
          subTopics: {},
        };
      }
      
      if (!lessons[lessonKey].subTopics[subTopicKey]) {
        lessons[lessonKey].subTopics[subTopicKey] = [];
      }
      
      lessons[lessonKey].subTopics[subTopicKey].push(p);
    });
    
    return lessons;
  }, [filteredProblems]);

  const handleProblemClick = (problem: DisplayProblem) => {
    if (problem.locked) {
      toast.info("This is a premium problem. Upgrade to unlock!", {
        description: "Get access to all problems and solutions.",
      });
      return;
    }
    navigate(`/practice/${skillId}/problem/${problem.slug}`);
  };

  const handleSolutionClick = (problem: DisplayProblem) => {
    if (problem.locked) {
      toast.info("Upgrade to view solutions", {
        description: "Premium members can access all solutions.",
      });
      return;
    }
    toast.info(`Solution: ${problem.title}`, {
      description: "Solution view coming soon!",
    });
  };

  const isLoading = skillLoading || problemsLoading;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Practice
        </Button>

        {/* Header */}
        <div className="mb-6">
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                {skill?.name || "Skill"}
              </h1>
              <p className="text-muted-foreground">{skill?.description || "Practice problems for this skill"}</p>
            </>
          )}
        </div>

        {/* Filters */}
        <ProblemFilters
          difficulty={difficulty}
          status={status}
          search={search}
          onDifficultyChange={setDifficulty}
          onStatusChange={setStatus}
          onSearchChange={setSearch}
        />

        {/* Problem Sections - Grouped by Lesson > Sub-Topic */}
        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : Object.keys(groupedByLesson).length > 0 ? (
            Object.entries(groupedByLesson).map(([lessonKey, lessonData]) => (
              <LessonProblemSection
                key={lessonKey}
                lessonTitle={lessonData.lessonTitle}
                subTopics={Object.entries(lessonData.subTopics).map(([title, problems]) => ({
                  title,
                  problems,
                }))}
                onProblemClick={handleProblemClick}
                onSolutionClick={handleSolutionClick}
              />
            ))
          ) : filteredProblems.length === 0 && displayProblems.length > 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No problems match your filters.</p>
              <Button
                variant="link"
                onClick={() => {
                  setDifficulty('all');
                  setStatus('all');
                  setSearch('');
                }}
                className="mt-2"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No problems available for this skill yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
