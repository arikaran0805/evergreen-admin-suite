import { useMemo } from "react";
import { CheckCircle2, Circle, FlaskConical, ArrowRight, ArrowUp, Play } from "lucide-react";
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

  // Calculate total lessons and positions
  const chartData = useMemo(() => {
    if (journeySteps.length === 0) return { courses: [], totalLessons: 0, completedLessons: 0 };

    const totalLessons = journeySteps.reduce((acc, step) => acc + step.lessonCount, 0);
    const completedLessons = journeySteps.reduce((acc, step) => acc + step.completedLessons, 0);
    
    let cumulativeLessons = 0;
    const totalCourses = journeySteps.length;
    const readinessPerCourse = 100 / totalCourses;

    const courses = journeySteps.map((step, index) => {
      const xStart = totalLessons > 0 ? (cumulativeLessons / totalLessons) * 100 : 0;
      cumulativeLessons += step.lessonCount;
      const xEnd = totalLessons > 0 ? (cumulativeLessons / totalLessons) * 100 : 0;
      
      // Y position based on career readiness contribution
      const yBase = index * readinessPerCourse;
      const yProgress = yBase + (readinessPerCourse * (step.progress / 100));
      
      return {
        ...step,
        xStart,
        xEnd,
        xMid: (xStart + xEnd) / 2,
        yBase,
        yProgress: step.isCompleted ? yBase + readinessPerCourse : yProgress,
        yMax: yBase + readinessPerCourse,
      };
    });

    return { courses, totalLessons, completedLessons };
  }, [journeySteps]);

  const chartHeight = 400;
  const chartPadding = { top: 40, right: 20, bottom: 60, left: 80 };

  return (
    <div className="relative bg-card rounded-xl border border-border p-4 md:p-6 overflow-hidden">
      {/* Chart Title */}
      <div className="mb-6">
        <h3 className="text-lg font-bold">{careerName} Roadmap</h3>
        <p className="text-sm text-muted-foreground">X-axis: Lessons & Hours • Y-axis: Career Readiness</p>
      </div>

      {/* Chart Container */}
      <div 
        className="relative"
        style={{ height: `${chartHeight}px` }}
      >
        {/* Y-Axis (Career Readiness) */}
        <div 
          className="absolute flex flex-col items-center"
          style={{ 
            left: 0, 
            top: chartPadding.top, 
            bottom: chartPadding.bottom,
            width: chartPadding.left 
          }}
        >
          {/* Y-axis line */}
          <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-border" />
          
          {/* Y-axis arrow */}
          <div className="absolute right-3 -top-2">
            <ArrowUp className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map((percent) => (
            <div
              key={percent}
              className="absolute right-6 text-xs text-muted-foreground transform -translate-y-1/2"
              style={{ bottom: `${percent}%` }}
            >
              {percent}%
            </div>
          ))}
          
          {/* Y-axis title */}
          <div 
            className="absolute -left-2 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground whitespace-nowrap"
          >
            Career Readiness
          </div>
        </div>

        {/* X-Axis (Lessons & Hours) */}
        <div 
          className="absolute flex items-center"
          style={{ 
            left: chartPadding.left, 
            right: chartPadding.right, 
            bottom: 0,
            height: chartPadding.bottom 
          }}
        >
          {/* X-axis line */}
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-border" />
          
          {/* X-axis arrow */}
          <div className="absolute right-0 top-2">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* X-axis labels - show lesson milestones */}
          <div className="absolute left-0 top-6 text-xs text-muted-foreground">0</div>
          <div className="absolute left-1/4 top-6 text-xs text-muted-foreground transform -translate-x-1/2">
            {Math.round(chartData.totalLessons * 0.25)}
          </div>
          <div className="absolute left-1/2 top-6 text-xs text-muted-foreground transform -translate-x-1/2">
            {Math.round(chartData.totalLessons * 0.5)}
          </div>
          <div className="absolute left-3/4 top-6 text-xs text-muted-foreground transform -translate-x-1/2">
            {Math.round(chartData.totalLessons * 0.75)}
          </div>
          <div className="absolute right-0 top-6 text-xs text-muted-foreground">
            {chartData.totalLessons}
          </div>
          
          {/* X-axis title */}
          <div className="absolute left-1/2 top-10 transform -translate-x-1/2 text-xs font-medium text-muted-foreground">
            Lessons & Hours
          </div>
        </div>

        {/* Current readiness line (horizontal) */}
        <div 
          className="absolute left-0 right-0 h-0.5 bg-primary/50 z-10"
          style={{ 
            left: chartPadding.left,
            right: chartPadding.right,
            bottom: `${chartPadding.bottom + ((chartHeight - chartPadding.top - chartPadding.bottom) * readinessPercent / 100)}px`
          }}
        >
          <Badge 
            className="absolute -right-2 top-1/2 transform -translate-y-1/2 translate-x-full whitespace-nowrap bg-primary text-primary-foreground text-xs"
          >
            {readinessPercent}%
          </Badge>
        </div>

        {/* Chart Area */}
        <div 
          className="absolute"
          style={{ 
            left: chartPadding.left, 
            right: chartPadding.right, 
            top: chartPadding.top, 
            bottom: chartPadding.bottom 
          }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Horizontal grid lines */}
            {[25, 50, 75].map((percent) => (
              <div
                key={`h-${percent}`}
                className="absolute left-0 right-0 h-px bg-border/30"
                style={{ bottom: `${percent}%` }}
              />
            ))}
            {/* Vertical grid lines */}
            {[25, 50, 75].map((percent) => (
              <div
                key={`v-${percent}`}
                className="absolute top-0 bottom-0 w-px bg-border/30"
                style={{ left: `${percent}%` }}
              />
            ))}
          </div>

          {/* SVG for the path and nodes */}
          <svg 
            className="absolute inset-0 w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Connection path */}
            {chartData.courses.length > 0 && (
              <path
                d={chartData.courses.map((course, index) => {
                  const x = course.xMid;
                  const y = 100 - course.yProgress;
                  if (index === 0) {
                    return `M 0,100 L ${x}%,${y}%`;
                  }
                  return `L ${x}%,${y}%`;
                }).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary/50"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Completed path overlay */}
            {chartData.courses.length > 0 && (
              <path
                d={chartData.courses
                  .filter(c => c.isCompleted || c.isStarted)
                  .map((course, index) => {
                    const x = course.xMid;
                    const y = 100 - course.yProgress;
                    if (index === 0) {
                      return `M 0,100 L ${x}%,${y}%`;
                    }
                    return `L ${x}%,${y}%`;
                  }).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-green-500"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* Course nodes */}
          {chartData.courses.map((course) => {
            const xPercent = course.xMid;
            const yPercent = 100 - course.yProgress;
            
            return (
              <div
                key={course.id}
                className="absolute transform -translate-x-1/2 translate-y-1/2 z-20"
                style={{
                  left: `${xPercent}%`,
                  bottom: `${100 - yPercent}%`,
                }}
              >
                {/* Node */}
                <div
                  onClick={() => navigate(`/course/${course.slug}`)}
                  className={`
                    relative flex flex-col items-center cursor-pointer transition-all hover:scale-110
                  `}
                >
                  {/* Circle indicator */}
                  <div 
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-md
                      ${course.isCompleted 
                        ? 'bg-green-500 border-green-400 text-white' 
                        : course.isStarted 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'bg-muted border-border text-muted-foreground'
                      }
                    `}
                  >
                    {course.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : course.isStarted ? (
                      <Play className="h-3 w-3 fill-current" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>

                  {/* Course label */}
                  <div 
                    className={`
                      absolute top-full mt-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap
                      bg-background/90 border border-border shadow-sm
                      ${course.isCompleted ? 'text-green-600 dark:text-green-400' : 
                        course.isStarted ? 'text-primary' : 'text-muted-foreground'}
                    `}
                  >
                    {course.name}
                    <span className="block text-[10px] text-muted-foreground font-normal">
                      {course.completedLessons}/{course.lessonCount} lessons
                    </span>
                  </div>

                  {/* Practice Lab branch for completed courses */}
                  {course.isCompleted && (
                    <div 
                      className="absolute -right-12 top-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/practice-lab');
                      }}
                    >
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all">
                        <FlaskConical className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        <span className="text-[10px] text-amber-700 dark:text-amber-400">Lab</span>
                      </div>
                    </div>
                  )}

                  {/* In Progress indicator */}
                  {course.isStarted && !course.isCompleted && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <Badge variant="outline" className="text-[10px] animate-pulse border-primary/50 text-primary px-1 py-0">
                        {course.progress}%
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Start point */}
          <div className="absolute bottom-0 left-0 transform translate-y-1/2 -translate-x-1/2">
            <div className="w-6 h-6 rounded-full bg-foreground/20 border-2 border-foreground/50 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-foreground/70" />
            </div>
            <span className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
              Start
            </span>
          </div>

          {/* Goal indicator */}
          <div className="absolute top-0 right-0 transform -translate-y-1/2 translate-x-1/2">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
              🎯 Job Ready
            </Badge>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle2 className="h-2.5 w-2.5 text-white" />
          </div>
          <span className="text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <Play className="h-2 w-2 text-primary-foreground fill-current" />
          </div>
          <span className="text-muted-foreground">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-muted border border-border flex items-center justify-center">
            <Circle className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
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
