import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, Zap, TrendingUp, CheckCircle } from "lucide-react";
import { CareerPath, getCareerPath } from "./CareerPathSelector";

interface CareerReadinessCardProps {
  selectedCareer: CareerPath;
  completedCourses: number;
  totalRequiredCourses: number;
  enrolledInCareer: number;
  onGetStarted?: () => void;
}

export const CareerReadinessCard = ({ 
  selectedCareer, 
  completedCourses, 
  totalRequiredCourses,
  enrolledInCareer,
  onGetStarted
}: CareerReadinessCardProps) => {
  const career = getCareerPath(selectedCareer);
  const readinessPercentage = totalRequiredCourses > 0 
    ? Math.round((completedCourses / totalRequiredCourses) * 100) 
    : 0;
  
  const getReadinessLevel = () => {
    if (readinessPercentage >= 80) return { label: 'Job Ready', color: 'bg-green-500', icon: CheckCircle };
    if (readinessPercentage >= 50) return { label: 'Intermediate', color: 'bg-yellow-500', icon: TrendingUp };
    if (readinessPercentage >= 20) return { label: 'Beginner', color: 'bg-orange-500', icon: Zap };
    return { label: 'Getting Started', color: 'bg-muted', icon: Target };
  };

  const readiness = getReadinessLevel();
  const ReadinessIcon = readiness.icon;

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
            className="gap-1"
            onClick={onGetStarted}
          >
            <ReadinessIcon className="h-3 w-3" />
            {readiness.label}
          </Button>
        </div>

        <div className="space-y-4">
          {/* Readiness Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Career Progress</span>
              <span className="font-semibold">{readinessPercentage}%</span>
            </div>
            <Progress value={readinessPercentage} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-2xl font-bold text-primary">{enrolledInCareer}</p>
              <p className="text-xs text-muted-foreground">Enrolled</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-2xl font-bold text-green-500">{completedCourses}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-2xl font-bold text-muted-foreground">{totalRequiredCourses}</p>
              <p className="text-xs text-muted-foreground">Required</p>
            </div>
          </div>

          {/* Skills Progress Indicators */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skills Progress</p>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i < Math.ceil(readinessPercentage / 20) 
                      ? 'bg-primary' 
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
