import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Zap, TrendingUp, CheckCircle } from "lucide-react";
import { useCareers } from "@/hooks/useCareers";
import * as Icons from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

interface SkillData {
  skill: string;
  value: number;
  fullMark: 100;
}

interface CareerReadinessCardProps {
  selectedCareerSlug: string;
  completedCourses: number;
  totalRequiredCourses: number;
  enrolledInCareer: number;
  completedCourseSlugs?: string[];
  onGetStarted?: () => void;
}

export const CareerReadinessCard = ({ 
  selectedCareerSlug, 
  completedCourses, 
  totalRequiredCourses,
  enrolledInCareer,
  completedCourseSlugs = [],
  onGetStarted
}: CareerReadinessCardProps) => {
  const { getCareerBySlug, getCareerSkills, getCareerCourseSlugs, getSkillContributionsForCourse, loading } = useCareers();
  
  const career = getCareerBySlug(selectedCareerSlug);
  const skills = career ? getCareerSkills(career.id) : [];
  const careerCourseSlugs = career ? getCareerCourseSlugs(career.id) : [];
  
  const readinessPercentage = totalRequiredCourses > 0 
    ? Math.round((completedCourses / totalRequiredCourses) * 100) 
    : 0;
  
  const getReadinessLevel = () => {
    if (readinessPercentage >= 80) return { label: 'Job Ready', color: 'text-green-500', icon: CheckCircle };
    if (readinessPercentage >= 50) return { label: 'Intermediate', color: 'text-yellow-500', icon: TrendingUp };
    if (readinessPercentage >= 20) return { label: 'Beginner', color: 'text-orange-500', icon: Zap };
    return { label: 'Getting Started', color: 'text-muted-foreground', icon: Target };
  };

  const readiness = getReadinessLevel();
  const ReadinessIcon = readiness.icon;

  // Calculate skill values based on completed courses and their skill contributions
  const calculateSkillData = (): SkillData[] => {
    if (!career || skills.length === 0) {
      return [{ skill: 'No skills defined', value: 10, fullMark: 100 }];
    }
    
    return skills.map(skill => {
      let skillValue = 0;
      
      // For each completed course in this career, add its contribution to this skill
      completedCourseSlugs.forEach(courseSlug => {
        if (careerCourseSlugs.includes(courseSlug)) {
          const contributions = getSkillContributionsForCourse(career.id, courseSlug);
          const contribution = contributions.find(c => c.skill_name === skill.skill_name);
          if (contribution) {
            skillValue += contribution.contribution;
          }
        }
      });
      
      // Cap at 100 and ensure minimum of 5 for visual appeal
      skillValue = Math.min(skillValue, 100);
      if (skillValue === 0) skillValue = 5;
      
      return {
        skill: skill.skill_name,
        value: Math.round(skillValue),
        fullMark: 100,
      };
    });
  };

  const skillData = calculateSkillData();

  const chartConfig: ChartConfig = {
    value: {
      label: "Proficiency",
      color: "hsl(var(--primary))",
    },
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-6 w-6" /> : <Icons.Briefcase className="h-6 w-6" />;
  };

  if (loading || !career) {
    return (
      <Card className="bg-gradient-to-br from-card to-muted/30 border-2">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30 border-2">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${career.color}`}>
              {getIcon(career.icon)}
            </div>
            <div>
              <h3 className="font-bold text-lg">{career.name}</h3>
              <p className="text-sm text-muted-foreground">Career Readiness</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className={`gap-1 ${readiness.color}`}
            onClick={onGetStarted}
          >
            <ReadinessIcon className="h-3 w-3" />
            {readiness.label}
          </Button>
        </div>

        {/* Radar Chart */}
        <div className="h-[220px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <RadarChart data={skillData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid 
                stroke="hsl(var(--border))" 
                strokeDasharray="3 3"
              />
              <PolarAngleAxis 
                dataKey="skill" 
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))', 
                  fontSize: 11,
                  fontWeight: 500
                }}
                tickLine={false}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={false}
                axisLine={false}
              />
              <Radar
                name="Skills"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value) => [`${value}%`, 'Proficiency']}
              />
            </RadarChart>
          </ChartContainer>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{enrolledInCareer}</p>
            <p className="text-xs text-muted-foreground">Enrolled</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{completedCourses}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{readinessPercentage}%</p>
            <p className="text-xs text-muted-foreground">Ready</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};
