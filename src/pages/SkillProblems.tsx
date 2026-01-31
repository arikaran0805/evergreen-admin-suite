import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProblemFilters } from "@/components/practice/ProblemFilters";
import { ProblemSection } from "@/components/practice/ProblemSection";
import { getSkillData } from "@/components/practice/mockProblemsData";
import { Problem, DifficultyFilter, StatusFilter } from "@/components/practice/types";
import { toast } from "sonner";

export default function SkillProblems() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const skillData = useMemo(() => getSkillData(skillId || ''), [skillId]);

  // Filter problems
  const filteredProblems = useMemo(() => {
    return skillData.problems.filter((p) => {
      if (difficulty !== 'all' && p.difficulty !== difficulty) return false;
      if (status === 'solved' && !p.solved) return false;
      if (status === 'unsolved' && p.solved) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [skillData.problems, difficulty, status, search]);

  // Group problems by subTopic
  const groupedProblems = useMemo(() => {
    const groups: Record<string, Problem[]> = {};
    filteredProblems.forEach((p) => {
      if (!groups[p.subTopic]) groups[p.subTopic] = [];
      groups[p.subTopic].push(p);
    });
    return groups;
  }, [filteredProblems]);

  const handleProblemClick = (problem: Problem) => {
    if (problem.locked) {
      toast.info("This is a premium problem. Upgrade to unlock!", {
        description: "Get access to all problems and solutions.",
      });
      return;
    }
    navigate(`/practice/${skillId}/problem/${problem.id}`);
  };

  const handleSolutionClick = (problem: Problem) => {
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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {skillData.name}
          </h1>
          <p className="text-muted-foreground">{skillData.description}</p>
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

        {/* Problem Sections */}
        <div className="mt-6 space-y-6">
          {Object.entries(groupedProblems).map(([subTopic, problems]) => (
            <ProblemSection
              key={subTopic}
              title={subTopic}
              problems={problems}
              onProblemClick={handleProblemClick}
              onSolutionClick={handleSolutionClick}
            />
          ))}

          {filteredProblems.length === 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
}
