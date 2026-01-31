import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, FlaskConical, ArrowRight, ArrowDown, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCourseNavigation } from "@/hooks/useCourseNavigation";

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
  const { navigateToCourse } = useCourseNavigation();

  // Calculate positions - Y goes DOWN (courses), X goes RIGHT (career readiness)
  const chartData = useMemo(() => {
    if (journeySteps.length === 0) return { courses: [], totalLessons: 0, completedLessons: 0 };

    const totalLessons = journeySteps.reduce((acc, step) => acc + step.lessonCount, 0);
    const completedLessons = journeySteps.reduce((acc, step) => acc + step.completedLessons, 0);
    
    const totalCourses = journeySteps.length;
    const ySpacing = 100 / totalCourses; // Equal vertical spacing for each course

    const courses = journeySteps.map((step, index) => {
      // Y position - goes DOWN (0% at top, 100% at bottom)
      const yPosition = (index + 0.5) * ySpacing;
      
      // X position - based on cumulative progress/readiness (0% at left, 100% at right)
      // Each completed course contributes to career readiness
      const xBase = (index / totalCourses) * 100;
      const xContribution = (1 / totalCourses) * (step.progress / 100) * 100;
      const xPosition = xBase + xContribution;
      
      return {
        ...step,
        xPosition,
        yPosition,
        xComplete: xBase + (100 / totalCourses), // Position if fully completed
      };
    });

    return { courses, totalLessons, completedLessons };
  }, [journeySteps]);

  const chartHeight = 450;
  const chartPadding = { top: 40, right: 40, bottom: 60, left: 50 };

  return (
    <div className="relative bg-card rounded-xl border border-border p-4 md:p-6 overflow-hidden">
      {/* Chart Title */}
      <div className="mb-4">
        <h3 className="text-lg font-bold">{careerName} Roadmap</h3>
        <p className="text-sm text-muted-foreground">
          Progress through courses to reach career readiness
        </p>
      </div>

      {/* Chart Container */}
      <div 
        className="relative"
        style={{ height: `${chartHeight}px` }}
      >
        {/* Y-Axis (Courses/Lessons - goes DOWN) */}
        <div 
          className="absolute"
          style={{ 
            left: 0, 
            top: chartPadding.top, 
            bottom: chartPadding.bottom,
            width: chartPadding.left 
          }}
        >
          {/* Y-axis line */}
          <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-border" />
          
          {/* Y-axis arrow pointing DOWN */}
          <div className="absolute right-[-6px] bottom-0">
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Y-axis label */}
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 -rotate-90 text-[10px] font-medium text-muted-foreground whitespace-nowrap"
            style={{ left: '-8px' }}
          >
            Courses
          </div>
        </div>

        {/* X-Axis (Career Readiness - goes RIGHT) */}
        <div 
          className="absolute"
          style={{ 
            left: chartPadding.left, 
            right: chartPadding.right, 
            top: 0,
            height: chartPadding.top 
          }}
        >
          {/* X-axis line */}
          <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-border" />
          
          {/* X-axis arrow pointing RIGHT */}
          <div className="absolute right-0 bottom-[-6px]">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* X-axis labels */}
          <div className="absolute left-0 bottom-2 text-[10px] text-muted-foreground">0%</div>
          <div className="absolute left-1/4 bottom-2 text-[10px] text-muted-foreground transform -translate-x-1/2">25%</div>
          <div className="absolute left-1/2 bottom-2 text-[10px] text-muted-foreground transform -translate-x-1/2">50%</div>
          <div className="absolute left-3/4 bottom-2 text-[10px] text-muted-foreground transform -translate-x-1/2">75%</div>
          <div className="absolute right-0 bottom-2 text-[10px] text-muted-foreground">100%</div>
          
          {/* X-axis title */}
          <div className="absolute left-1/2 top-1 transform -translate-x-1/2 text-xs font-medium text-muted-foreground">
            Career Readiness
          </div>
        </div>

        {/* Origin point label */}
        <div 
          className="absolute flex items-center gap-1"
          style={{ left: chartPadding.left - 4, top: chartPadding.top - 4 }}
        >
          <div className="w-3 h-3 rounded-full bg-foreground/30 border-2 border-foreground/60 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-foreground" />
          </div>
          <span className="text-[9px] text-muted-foreground ml-1">Start</span>
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
            {/* Vertical grid lines */}
            {[25, 50, 75].map((percent) => (
              <div
                key={`v-${percent}`}
                className="absolute top-0 bottom-0 w-px bg-border/20"
                style={{ left: `${percent}%` }}
              />
            ))}
            {/* Horizontal grid lines - one for each course */}
            {chartData.courses.map((course, index) => (
              <div
                key={`h-${index}`}
                className="absolute left-0 right-0 h-px bg-border/20"
                style={{ top: `${course.yPosition}%` }}
              />
            ))}
          </div>

          {/* SVG for the progress path */}
          <svg 
            className="absolute inset-0 w-full h-full overflow-visible"
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(142, 71%, 45%)" />
              </linearGradient>
            </defs>

            {/* Full path (background/remaining) - animated draw */}
            {chartData.courses.length > 0 && (
              <polyline
                points={[
                  "0,0",
                  ...chartData.courses.map((course) => 
                    `${course.xComplete}%,${course.yPosition}%`
                  )
                ].join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="6,4"
                className="text-border animate-[drawPath_1.5s_ease-out_forwards]"
                style={{
                  strokeDasharray: '1000',
                  strokeDashoffset: '1000',
                  animation: 'drawPath 1.5s ease-out forwards',
                }}
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Progress path (completed portion) - animated draw */}
            {chartData.courses.length > 0 && chartData.courses.some(c => c.isCompleted || c.isStarted) && (
              <polyline
                points={[
                  "0,0",
                  ...chartData.courses
                    .filter(c => c.isCompleted || c.isStarted)
                    .map((course) => 
                      `${course.xPosition}%,${course.yPosition}%`
                    )
                ].join(' ')}
                fill="none"
                stroke="hsl(142, 71%, 45%)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: '1000',
                  strokeDashoffset: '1000',
                  animation: 'drawProgressPath 2s ease-out 0.5s forwards',
                }}
                vectorEffect="non-scaling-stroke"
              />
            )}

            <style>
              {`
                @keyframes drawPath {
                  to {
                    stroke-dashoffset: 0;
                  }
                }
                @keyframes drawProgressPath {
                  to {
                    stroke-dashoffset: 0;
                  }
                }
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                  }
                  to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                  }
                }
                @keyframes fadeInBranch {
                  from {
                    opacity: 0;
                    stroke-dashoffset: 50;
                  }
                  to {
                    opacity: 1;
                    stroke-dashoffset: 0;
                  }
                }
              `}
            </style>

            {/* Branch lines to practice labs - animated */}
            {chartData.courses.map((course, index) => {
              if (!course.isCompleted) return null;
              return (
                <line
                  key={`lab-${course.id}`}
                  x1={`${course.xPosition}%`}
                  y1={`${course.yPosition}%`}
                  x2={`${course.xPosition + 8}%`}
                  y2={`${course.yPosition + 6}%`}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-amber-500"
                  style={{
                    strokeDasharray: '50',
                    strokeDashoffset: '50',
                    animation: `fadeInBranch 0.5s ease-out ${1.5 + index * 0.2}s forwards`,
                  }}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            {/* "Live progress" branch for in-progress courses - animated */}
            {chartData.courses.map((course, index) => {
              if (!course.isStarted || course.isCompleted) return null;
              return (
                <line
                  key={`progress-${course.id}`}
                  x1={`${course.xPosition}%`}
                  y1={`${course.yPosition}%`}
                  x2={`${course.xPosition + 6}%`}
                  y2={`${course.yPosition - 5}%`}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="3,2"
                  className="text-primary"
                  style={{
                    opacity: 0,
                    animation: `fadeInBranch 0.5s ease-out ${1.5 + index * 0.2}s forwards`,
                  }}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {/* Course nodes - animated */}
          {chartData.courses.map((course, index) => (
            <div
              key={course.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
              style={{
                left: `${course.xPosition}%`,
                top: `${course.yPosition}%`,
                opacity: 0,
                animation: `fadeIn 0.4s ease-out ${0.8 + index * 0.15}s forwards`,
              }}
            >
              {/* Node */}
              <div
                onClick={() => navigateToCourse(course.slug, course.id)}
                className="relative flex items-center cursor-pointer transition-all hover:scale-110"
              >
                {/* Circle indicator */}
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg
                    ${course.isCompleted 
                      ? 'bg-green-500 border-green-400 text-white' 
                      : course.isStarted 
                        ? 'bg-primary border-primary text-primary-foreground animate-pulse' 
                        : 'bg-muted border-border text-muted-foreground'
                    }
                  `}
                >
                  {course.isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : course.isStarted ? (
                    <Play className="h-4 w-4 fill-current" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>

                {/* Course label - positioned to the right */}
                <div 
                  className={`
                    absolute left-full ml-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap
                    bg-background/95 border border-border shadow-sm
                    ${course.isCompleted ? 'text-green-600 dark:text-green-400' : 
                      course.isStarted ? 'text-primary' : 'text-muted-foreground'}
                  `}
                >
                  {course.name}
                  <span className="block text-[10px] text-muted-foreground font-normal">
                    {course.completedLessons}/{course.lessonCount} lessons
                  </span>
                </div>
              </div>

              {/* Practice Lab branch for completed courses */}
              {course.isCompleted && (
                <div 
                  className="absolute"
                  style={{ left: 'calc(100% + 8px)', top: 'calc(100% + 4px)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/profile?tab=practice');
                  }}
                >
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer">
                    <FlaskConical className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] text-amber-700 dark:text-amber-400">Practice Lab</span>
                  </div>
                </div>
              )}

              {/* Live Progress indicator for in-progress courses */}
              {course.isStarted && !course.isCompleted && (
                <div 
                  className="absolute"
                  style={{ left: 'calc(100% + 4px)', top: '-16px' }}
                >
                  <Badge variant="outline" className="text-[10px] border-primary/50 text-primary px-1.5 py-0 bg-background">
                    Live: {course.progress}%
                  </Badge>
                </div>
              )}
            </div>
          ))}

          {/* Goal indicator (bottom-right) */}
          <div className="absolute bottom-0 right-0 transform translate-y-1/2 translate-x-1/2">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs shadow-lg">
              🎯 Job Ready
            </Badge>
          </div>
        </div>

        {/* Current progress indicator line (vertical) */}
        <div 
          className="absolute w-0.5 bg-primary/40 z-10"
          style={{ 
            top: chartPadding.top,
            bottom: chartPadding.bottom,
            left: `${chartPadding.left + ((100 - chartPadding.left - chartPadding.right) * readinessPercent / 100)}px`
          }}
        >
          <Badge 
            className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full whitespace-nowrap bg-primary text-primary-foreground text-[10px] px-1.5"
          >
            {readinessPercent}% Ready
          </Badge>
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
