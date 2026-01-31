import { Problem } from "./types";
import { ProblemRow } from "./ProblemRow";

interface SubTopicGroup {
  title: string;
  problems: Problem[];
}

interface LessonProblemSectionProps {
  lessonTitle: string;
  subTopics: SubTopicGroup[];
  onProblemClick: (problem: Problem) => void;
  onSolutionClick: (problem: Problem) => void;
}

export function LessonProblemSection({ 
  lessonTitle, 
  subTopics, 
  onProblemClick, 
  onSolutionClick 
}: LessonProblemSectionProps) {
  const totalProblems = subTopics.reduce((sum, st) => sum + st.problems.length, 0);
  
  if (totalProblems === 0) return null;

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden bg-card">
      {/* Lesson Header */}
      <div className="px-4 py-3 bg-muted/50 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">{lessonTitle}</h3>
      </div>

      {/* Sub-Topics */}
      <div className="divide-y divide-border/30">
        {subTopics.map((subTopic) => (
          <div key={subTopic.title}>
            {/* Sub-Topic Header - only show if multiple sub-topics or different from lesson */}
            {(subTopics.length > 1 || subTopic.title !== lessonTitle) && (
              <div className="px-4 py-2 pl-6 bg-muted/20 border-b border-border/30">
                <span className="text-xs font-medium text-muted-foreground">{subTopic.title}</span>
              </div>
            )}
            
            {/* Problems in this Sub-Topic */}
            <div>
              {subTopic.problems.map((problem) => (
                <ProblemRow
                  key={problem.id}
                  problem={problem}
                  onClick={() => onProblemClick(problem)}
                  onSolutionClick={() => onSolutionClick(problem)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
