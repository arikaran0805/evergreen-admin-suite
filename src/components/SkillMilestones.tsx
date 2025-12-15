import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Zap, Target, Crown, Flame, Medal, ChevronRight, Sparkles } from "lucide-react";

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
  compact?: boolean;
  onViewAll?: () => void;
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

export const SkillMilestones = ({ completedCourses, readinessPercentage, compact = false, onViewAll }: SkillMilestonesProps) => {
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const prevUnlockedRef = useRef<Set<string>>(new Set());

  const isMilestoneUnlocked = (milestone: Milestone): boolean => {
    if (milestone.id === 'first-step') return completedCourses >= 1;
    if (milestone.id === 'on-track') return completedCourses >= 3;
    return readinessPercentage >= milestone.threshold;
  };

  const unlockedMilestones = milestones.filter(m => isMilestoneUnlocked(m));
  const unlockedIds = new Set(unlockedMilestones.map(m => m.id));

  // Detect newly unlocked milestones
  useEffect(() => {
    const newlyUnlocked = [...unlockedIds].find(id => !prevUnlockedRef.current.has(id));
    if (newlyUnlocked && prevUnlockedRef.current.size > 0) {
      setCelebratingId(newlyUnlocked);
      const timer = setTimeout(() => setCelebratingId(null), 2000);
      return () => clearTimeout(timer);
    }
    prevUnlockedRef.current = unlockedIds;
  }, [completedCourses, readinessPercentage]);

  const displayMilestones = compact ? unlockedMilestones.slice(-3) : milestones;

  if (compact && unlockedMilestones.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30 border-2 mt-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-sm">{compact ? 'Recent Achievements' : 'Milestones'}</h3>
          </div>
          {compact ? (
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={onViewAll}>
              View All <ChevronRight className="h-3 w-3" />
            </Button>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {unlockedMilestones.length}/{milestones.length}
            </Badge>
          )}
        </div>

        <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-3 md:grid-cols-6'} gap-2`}>
          {displayMilestones.map((milestone) => {
            const unlocked = isMilestoneUnlocked(milestone);
            const isCelebrating = celebratingId === milestone.id;
            
            return (
              <div
                key={milestone.id}
                className={`relative flex flex-col items-center p-2 rounded-lg border transition-all ${
                  unlocked 
                    ? `${milestone.bgColor} border-transparent` 
                    : 'bg-muted/30 border-dashed border-border opacity-50'
                } ${isCelebrating ? 'animate-bounce' : ''}`}
                title={milestone.description}
              >
                {/* Celebration sparkles */}
                {isCelebrating && (
                  <>
                    <Sparkles className="absolute -top-1 -left-1 h-3 w-3 text-amber-400 animate-ping" />
                    <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-400 animate-ping" style={{ animationDelay: '0.2s' }} />
                    <Sparkles className="absolute -bottom-1 left-1/2 h-3 w-3 text-amber-400 animate-ping" style={{ animationDelay: '0.4s' }} />
                  </>
                )}
                
                <div className={`p-2 rounded-full ${unlocked ? milestone.bgColor : 'bg-muted'} ${isCelebrating ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
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
