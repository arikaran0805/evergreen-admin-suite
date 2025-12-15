import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Zap, Target, Award, Crown, Flame, Medal } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  threshold: number;
  color: string;
  bgColor: string;
}

interface SkillMilestonesProps {
  completedCourses: number;
  readinessPercentage: number;
}

const milestones: Milestone[] = [
  {
    id: 'first-step',
    title: 'First Step',
    description: 'Complete your first course',
    icon: <Zap className="h-4 w-4" />,
    threshold: 1,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'on-track',
    title: 'On Track',
    description: 'Complete 3 courses',
    icon: <Target className="h-4 w-4" />,
    threshold: 3,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'rising-star',
    title: 'Rising Star',
    description: 'Reach 25% readiness',
    icon: <Star className="h-4 w-4" />,
    threshold: 25,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    id: 'half-way',
    title: 'Halfway There',
    description: 'Reach 50% readiness',
    icon: <Flame className="h-4 w-4" />,
    threshold: 50,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    id: 'achiever',
    title: 'Achiever',
    description: 'Reach 75% readiness',
    icon: <Medal className="h-4 w-4" />,
    threshold: 75,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'master',
    title: 'Career Ready',
    description: 'Reach 100% readiness',
    icon: <Crown className="h-4 w-4" />,
    threshold: 100,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
];

export const SkillMilestones = ({ completedCourses, readinessPercentage }: SkillMilestonesProps) => {
  const isMilestoneUnlocked = (milestone: Milestone): boolean => {
    // First two milestones are based on completed courses
    if (milestone.id === 'first-step') return completedCourses >= 1;
    if (milestone.id === 'on-track') return completedCourses >= 3;
    // Rest are based on readiness percentage
    return readinessPercentage >= milestone.threshold;
  };

  const unlockedCount = milestones.filter(m => isMilestoneUnlocked(m)).length;

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30 border-2 mt-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-sm">Milestones</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {unlockedCount}/{milestones.length}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {milestones.map((milestone) => {
            const unlocked = isMilestoneUnlocked(milestone);
            return (
              <div
                key={milestone.id}
                className={`flex flex-col items-center p-2 rounded-lg border transition-all ${
                  unlocked 
                    ? `${milestone.bgColor} border-transparent` 
                    : 'bg-muted/30 border-dashed border-border opacity-50'
                }`}
                title={milestone.description}
              >
                <div className={`p-2 rounded-full ${unlocked ? milestone.bgColor : 'bg-muted'}`}>
                  <span className={unlocked ? milestone.color : 'text-muted-foreground'}>
                    {milestone.icon}
                  </span>
                </div>
                <span className={`text-xs font-medium mt-1 text-center ${unlocked ? milestone.color : 'text-muted-foreground'}`}>
                  {milestone.title}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
