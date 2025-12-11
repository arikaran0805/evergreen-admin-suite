import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Zap, TrendingUp, CheckCircle } from "lucide-react";
import { CareerPath, getCareerPath } from "./CareerPathSelector";
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
  ResponsiveContainer,
} from "recharts";

// Define skill areas for each career path
const careerSkillsMap: Record<CareerPath, string[]> = {
  'data-science': ['Programming', 'Statistics', 'ML/AI', 'Data Viz', 'Domain Knowledge', 'Big Data'],
  'data-engineer': ['Programming', 'Databases', 'ETL/Pipelines', 'Cloud', 'Big Data', 'DevOps'],
  'ml-engineer': ['Programming', 'ML/AI', 'Statistics', 'MLOps', 'Cloud', 'Deep Learning'],
  'analyst': ['Statistics', 'SQL', 'Data Viz', 'Excel', 'Communication', 'Domain Knowledge'],
  'full-stack': ['Frontend', 'Backend', 'Databases', 'DevOps', 'APIs', 'Security'],
  'business-analyst': ['Analysis', 'SQL', 'Communication', 'Domain Knowledge', 'Data Viz', 'Process'],
  'devops-engineer': ['CI/CD', 'Cloud', 'Containers', 'Monitoring', 'Security', 'Scripting'],
  'cloud-architect': ['Cloud', 'Networking', 'Security', 'Architecture', 'DevOps', 'Cost Mgmt'],
};

// Map course slugs to skills
const courseSkillMapping: Record<string, string[]> = {
  'python-for-data-science': ['Programming', 'Scripting', 'Backend'],
  'statistics': ['Statistics', 'Analysis', 'Data Viz'],
  'ai-ml': ['ML/AI', 'Deep Learning', 'MLOps'],
  'database': ['Databases', 'SQL', 'ETL/Pipelines', 'Big Data'],
};

interface SkillData {
  skill: string;
  value: number;
  fullMark: 100;
}

interface CareerReadinessCardProps {
  selectedCareer: CareerPath;
  completedCourses: number;
  totalRequiredCourses: number;
  enrolledInCareer: number;
  completedCourseSlugs?: string[];
  onGetStarted?: () => void;
}

export const CareerReadinessCard = ({ 
  selectedCareer, 
  completedCourses, 
  totalRequiredCourses,
  enrolledInCareer,
  completedCourseSlugs = [],
  onGetStarted
}: CareerReadinessCardProps) => {
  const career = getCareerPath(selectedCareer);
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

  // Calculate skill values based on completed courses
  const calculateSkillData = (): SkillData[] => {
    const skills = careerSkillsMap[selectedCareer] || [];
    
    return skills.map(skill => {
      // Check if any completed course contributes to this skill
      let skillValue = 0;
      completedCourseSlugs.forEach(slug => {
        const courseSkills = courseSkillMapping[slug] || [];
        if (courseSkills.includes(skill)) {
          skillValue += 33; // Each course adds ~33% to a skill
        }
      });
      
      // Cap at 100
      skillValue = Math.min(skillValue, 100);
      
      // Add a base value of 10 for visual appeal
      if (skillValue === 0) skillValue = 10;
      
      return {
        skill,
        value: skillValue,
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

  if (!career) return null;

  const CareerIcon = career.icon;

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30 border-2">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${career.color}`}>
              <CareerIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{career.label}</h3>
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
