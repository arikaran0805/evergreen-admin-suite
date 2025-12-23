import { useMemo } from "react";
import { CheckCircle2, Circle, FlaskConical, ArrowRight, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface CourseStep {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  isCompleted: boolean;
  isStarted: boolean;
  isEnrolled: boolean;
  progress: number;
  lessonCount: number;
  completedLessons: number;
  skills: string[];
  order: number;
}

interface CareerRoadmapChartProps {
  journeySteps: CourseStep[];
  readinessPercent: number;
  careerName: string;
}

export const CareerRoadmapChart = ({ 
  journeySteps, 
  readinessPercent,
  careerName 
}: CareerRoadmapChartProps) => {
  const navigate = useNavigate();

  // Calculate positions for each course on the chart
  const chartData = useMemo(() => {
    if (journeySteps.length === 0) return [];

    // Each course takes equal vertical space
    // X position is based on cumulative progress
    let cumulativeProgress = 0;
    const totalCourses = journeySteps.length;
    const readinessPerCourse = 100 / totalCourses;

    return journeySteps.map((step, index) => {
      const startX = cumulativeProgress;
      const courseContribution = readinessPerCourse * (step.progress / 100);
      cumulativeProgress += courseContribution;
      
      return {
        ...step,
        yPosition: index,
        xStart: startX,
        xEnd: cumulativeProgress,
        xCompleted: step.isCompleted ? startX + readinessPerCourse : startX + courseContribution,
      };
    });
  }, [journeySteps]);

  const chartHeight = Math.max(400, journeySteps.length * 100 + 100);
  const chartWidth = 100; // percentage based

  return (
    <div className="relative bg-card rounded-xl border border-border p-4 md:p-6 overflow-hidden">
      {/* Chart Title */}
      <div className="mb-6">
        <h3 className="text-lg font-bold">{careerName} Roadmap</h3>
        <p className="text-sm text-muted-foreground">X-axis: Career Readiness • Y-axis: Learning Path</p>
      </div>

      {/* Chart Container */}
      <div className="relative" style={{ minHeight: `${chartHeight}px` }}>
        {/* Y-Axis */}
        <div className="absolute left-0 top-0 bottom-16 w-12 flex flex-col items-center">
          <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-border" />
          <div className="absolute top-0 left-3 w-6 h-0.5 bg-border" />
          <div className="absolute bottom-0 left-3 w-6 h-0.5 bg-border" />
          {/* Y-axis arrow */}
          <div className="absolute bottom-0 left-4 transform translate-y-2">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-foreground/50" />
          </div>
          {/* Y-axis label */}
          <div 
            className="absolute -left-2 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground whitespace-nowrap"
          >
            Courses & Lessons
          </div>
        </div>

        {/* X-Axis */}
        <div className="absolute bottom-4 left-12 right-4 h-8 flex items-center">
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-border" />
          {/* X-axis arrow */}
          <div className="absolute right-0 top-0 transform -translate-y-1">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {/* X-axis labels */}
          <div className="absolute left-0 top-3 text-xs text-muted-foreground">0%</div>
          <div className="absolute left-1/4 top-3 text-xs text-muted-foreground">25%</div>
          <div className="absolute left-1/2 top-3 text-xs text-muted-foreground transform -translate-x-1/2">50%</div>
          <div className="absolute left-3/4 top-3 text-xs text-muted-foreground">75%</div>
          <div className="absolute right-0 top-3 text-xs text-muted-foreground">100%</div>
          {/* X-axis title */}
          <div className="absolute left-1/2 top-7 transform -translate-x-1/2 text-xs font-medium text-muted-foreground">
            Career Readiness
          </div>
        </div>

        {/* Current progress line */}
        <div 
          className="absolute top-0 bottom-16 w-0.5 bg-primary/50 z-10"
          style={{ left: `calc(48px + ${(readinessPercent / 100) * (100 - 48)}%)` }}
        >
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full bg-primary animate-pulse" />
          <Badge 
            className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-primary text-primary-foreground text-xs"
          >
            {readinessPercent}% Ready
          </Badge>
        </div>

        {/* Chart Area */}
        <div className="ml-14 mr-4 pb-16 relative" style={{ minHeight: `${chartHeight - 80}px` }}>
          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none">
            {[0, 25, 50, 75, 100].map((percent) => (
              <div
                key={percent}
                className="absolute top-0 bottom-0 w-px bg-border/30"
                style={{ left: `${percent}%` }}
              />
            ))}
          </div>

          {/* SVG for connection lines */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            style={{ minHeight: `${chartHeight - 80}px` }}
          >
            {chartData.map((step, index) => {
              if (index === 0) return null;
              const prevStep = chartData[index - 1];
              const ySpacing = 90;
              const prevY = prevStep.yPosition * ySpacing + 40;
              const currY = step.yPosition * ySpacing + 40;
              const prevX = `${prevStep.xCompleted}%`;
              const currX = `${step.xStart}%`;
              
              return (
                <g key={step.id}>
                  {/* Diagonal connection line */}
                  <line
                    x1={prevX}
                    y1={prevY}
                    x2={currX}
                    y2={currY}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={step.isStarted || prevStep.isCompleted ? "0" : "4"}
                    className={prevStep.isCompleted ? "text-green-500" : "text-border"}
                  />
                </g>
              );
            })}
          </svg>

          {/* Course nodes */}
          {chartData.map((step, index) => {
            const ySpacing = 90;
            const yPos = step.yPosition * ySpacing + 20;
            
            return (
              <div
                key={step.id}
                className="absolute flex items-center gap-3"
                style={{
                  top: `${yPos}px`,
                  left: `${step.xStart}%`,
                  width: `${Math.max(30, 100 / journeySteps.length)}%`,
                }}
              >
                {/* Course Node */}
                <div
                  onClick={() => navigate(`/course/${step.slug}`)}
                  className={`
                    relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
                    border shadow-sm hover:shadow-md hover:scale-105
                    ${step.isCompleted 
                      ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' 
                      : step.isStarted 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-muted/50 border-border'
                    }
                  `}
                >
                  {/* Status Icon */}
                  <div className="shrink-0">
                    {step.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : step.isStarted ? (
                      <Play className="h-4 w-4 text-primary fill-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Course Info */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{step.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.completedLessons}/{step.lessonCount} lessons • {step.progress}%
                    </p>
                  </div>

                  {/* Progress bar within node */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg overflow-hidden bg-border/30">
                    <div 
                      className={`h-full transition-all ${step.isCompleted ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>

                {/* Practice Lab branch (shown for completed courses) */}
                {step.isCompleted && (
                  <div className="relative">
                    <div className="absolute -left-2 top-1/2 w-2 h-0.5 bg-amber-500/50" />
                    <div
                      onClick={() => navigate('/practice-lab')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 cursor-pointer hover:bg-amber-500/20 transition-all"
                    >
                      <FlaskConical className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs text-amber-700 dark:text-amber-400 whitespace-nowrap">Practice</span>
                    </div>
                  </div>
                )}

                {/* Live Progress indicator for in-progress courses */}
                {step.isStarted && !step.isCompleted && (
                  <Badge variant="outline" className="text-xs animate-pulse border-primary/50 text-primary">
                    In Progress
                  </Badge>
                )}
              </div>
            );
          })}

          {/* Origin point */}
          <div className="absolute top-4 -left-2 flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-foreground/20 border-2 border-foreground/50 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground/70" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Start</span>
          </div>

          {/* End goal */}
          {journeySteps.length > 0 && (
            <div 
              className="absolute flex items-center gap-2"
              style={{ 
                top: `${(journeySteps.length - 1) * 90 + 20}px`,
                right: '0'
              }}
            >
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                🎯 Job Ready
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Play className="h-3 w-3 text-primary fill-primary" />
          <span className="text-muted-foreground">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Not Started</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FlaskConical className="h-4 w-4 text-amber-500" />
          <span className="text-muted-foreground">Practice Lab</span>
        </div>
      </div>
    </div>
  );
};
