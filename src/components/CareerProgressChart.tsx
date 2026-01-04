import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Lock, 
  CheckCircle2, 
  Play, 
  Trophy, 
  Target, 
  Rocket, 
  Star,
  Sparkles,
  ChevronRight,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  contributionPercent?: number; // Contribution to career readiness
  learningHours?: number; // Learning hours for this course
}

interface CareerProgressChartProps {
  journeySteps: CourseStep[];
  readinessPercent: number;
  careerName: string;
  totalLearningHours?: number;
}

// Milestone definitions
const milestones = [
  { percent: 0, label: "Started", icon: Target, emoji: "🎯" },
  { percent: 50, label: "Halfway", icon: Rocket, emoji: "🚀" },
  { percent: 100, label: "Completed", icon: Trophy, emoji: "🏆" },
];

export const CareerProgressChart = ({ 
  journeySteps, 
  readinessPercent,
  careerName,
  totalLearningHours = 120 
}: CareerProgressChartProps) => {
  const navigate = useNavigate();
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationCourse, setCelebrationCourse] = useState<string | null>(null);

  // Calculate chart data with sequential locking
  const chartData = useMemo(() => {
    if (journeySteps.length === 0) return { 
      courses: [], 
      totalHours: totalLearningHours, 
      currentHours: 0,
      activeIndex: 0 
    };

    const totalCourses = journeySteps.length;
    
    // Calculate contribution per course (equal distribution if not specified)
    const defaultContribution = 100 / totalCourses;
    
    // Calculate learning hours per course based on contribution
    let cumulativeHours = 0;
    let cumulativeReadiness = 0;
    let activeIndex = 0;
    let foundActive = false;

    const courses = journeySteps.map((step, index) => {
      const contribution = step.contributionPercent || defaultContribution;
      const hours = step.learningHours || (totalLearningHours * (contribution / 100));
      
      // Determine if course is locked (all courses after active are locked)
      const previousCourse = index > 0 ? journeySteps[index - 1] : null;
      const isPreviousCompleted = index === 0 || (previousCourse?.isCompleted ?? false);
      const isLocked = !isPreviousCompleted && !step.isCompleted && !step.isStarted;
      const isActive = isPreviousCompleted && !step.isCompleted && !foundActive;
      
      if (isActive) {
        activeIndex = index;
        foundActive = true;
      }

      // Calculate positions on the chart
      const startHours = cumulativeHours;
      const startReadiness = cumulativeReadiness;
      
      // Progress within this course
      const courseProgress = step.progress / 100;
      const earnedReadiness = contribution * courseProgress;
      const earnedHours = hours * courseProgress;
      
      cumulativeHours += step.isCompleted ? hours : earnedHours;
      cumulativeReadiness += step.isCompleted ? contribution : earnedReadiness;

      // Validation phase detection (if progress > 80%, assume in validation)
      const isInValidation = step.isStarted && !step.isCompleted && step.progress > 80;

      return {
        ...step,
        contribution,
        hours,
        startHours,
        startReadiness,
        currentHours: startHours + earnedHours,
        currentReadiness: startReadiness + earnedReadiness,
        endHours: startHours + hours,
        endReadiness: startReadiness + contribution,
        isLocked,
        isActive,
        isInValidation,
      };
    });

    return { 
      courses, 
      totalHours: totalLearningHours, 
      currentHours: cumulativeHours,
      currentReadiness: cumulativeReadiness,
      activeIndex 
    };
  }, [journeySteps, totalLearningHours]);

  // Check for completion celebrations
  useEffect(() => {
    const recentlyCompleted = chartData.courses.find(c => 
      c.isCompleted && !celebrationCourse
    );
    if (recentlyCompleted && readinessPercent === 100) {
      setShowCelebration(true);
      setCelebrationCourse("final");
    }
  }, [chartData.courses, readinessPercent, celebrationCourse]);

  const chartHeight = 400;
  const chartPadding = { top: 60, right: 80, bottom: 80, left: 80 };
  const chartWidth = 100; // percentage

  // Convert data coordinates to chart coordinates
  const toChartX = (hours: number) => (hours / totalLearningHours) * 100;
  const toChartY = (readiness: number) => 100 - readiness; // Invert Y axis

  // Generate path points for the line
  const generatePath = () => {
    if (chartData.courses.length === 0) return "";
    
    const points: string[] = ["0,100"]; // Start at origin (0 hours, 0%)
    
    chartData.courses.forEach((course, index) => {
      // End point of learning phase
      const learningEndX = toChartX(course.currentHours);
      const learningEndY = toChartY(course.currentReadiness);
      
      points.push(`${learningEndX},${learningEndY}`);
      
      // If in validation, add horizontal line
      if (course.isInValidation) {
        const validationEndX = toChartX(course.currentHours + (course.hours * 0.1));
        points.push(`${validationEndX},${learningEndY}`);
      }
    });
    
    return points.join(" ");
  };

  // Generate the full path (dashed, showing target)
  const generateFullPath = () => {
    if (chartData.courses.length === 0) return "";
    
    const points: string[] = ["0,100"];
    
    chartData.courses.forEach((course) => {
      const endX = toChartX(course.endHours);
      const endY = toChartY(course.endReadiness);
      points.push(`${endX},${endY}`);
    });
    
    return points.join(" ");
  };

  const activeCourse = chartData.courses[chartData.activeIndex];

  return (
    <div className="relative bg-gradient-to-br from-card via-card to-muted/20 rounded-2xl border border-border p-6 overflow-hidden">
      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ scale: 0.5, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 20 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                <Trophy className="h-24 w-24 mx-auto text-amber-500 drop-shadow-lg" />
              </motion.div>
              <h2 className="text-3xl font-bold mt-4 bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                100% Career Readiness Achieved!
              </h2>
              <p className="text-muted-foreground mt-2">
                You've completed all courses in the {careerName} path
              </p>
              <div className="flex gap-4 justify-center mt-6">
                <Badge className="px-4 py-2 text-lg bg-amber-500/20 text-amber-600 border-amber-500/30">
                  🏆 Career Champion
                </Badge>
                <Badge className="px-4 py-2 text-lg bg-primary/20 text-primary border-primary/30">
                  🛡️ Career Shield Earned
                </Badge>
              </div>
              <Button 
                variant="outline" 
                className="mt-6"
                onClick={() => setShowCelebration(false)}
              >
                Continue Learning
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Career Chart
            </span>
            <Badge variant="outline" className="font-normal">
              {careerName}
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sequential skill mastery — strong foundations unlock future success
          </p>
        </div>
        
        {/* Overall progress indicator */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{Math.round(readinessPercent)}%</div>
            <div className="text-xs text-muted-foreground">Career Readiness</div>
          </div>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-4 border-primary/30">
            {readinessPercent >= 100 ? (
              <Trophy className="h-8 w-8 text-amber-500" />
            ) : readinessPercent >= 50 ? (
              <Rocket className="h-8 w-8 text-primary" />
            ) : (
              <Target className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div 
        className="relative bg-background/50 rounded-xl border border-border/50"
        style={{ height: `${chartHeight}px` }}
      >
        {/* Y-Axis Label (Career Readiness) */}
        <div 
          className="absolute text-xs font-medium text-muted-foreground"
          style={{ 
            left: 8, 
            top: '50%', 
            transform: 'rotate(-90deg) translateX(50%)',
            transformOrigin: 'left center',
            whiteSpace: 'nowrap'
          }}
        >
          % Career Readiness
        </div>

        {/* Y-Axis Ticks */}
        <div 
          className="absolute flex flex-col justify-between text-xs text-muted-foreground"
          style={{ 
            left: chartPadding.left - 30, 
            top: chartPadding.top, 
            bottom: chartPadding.bottom,
            width: 25,
            textAlign: 'right'
          }}
        >
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* X-Axis Label (Learning Hours) */}
        <div 
          className="absolute text-xs font-medium text-muted-foreground text-center"
          style={{ 
            bottom: 8, 
            left: chartPadding.left, 
            right: chartPadding.right 
          }}
        >
          Learning Hours
        </div>

        {/* X-Axis Ticks */}
        <div 
          className="absolute flex justify-between text-xs text-muted-foreground"
          style={{ 
            left: chartPadding.left, 
            right: chartPadding.right, 
            bottom: chartPadding.bottom - 20 
          }}
        >
          <span>0</span>
          <span>{Math.round(totalLearningHours * 0.25)}</span>
          <span>{Math.round(totalLearningHours * 0.5)}</span>
          <span>{Math.round(totalLearningHours * 0.75)}</span>
          <span>{totalLearningHours}</span>
        </div>

        {/* Chart Area */}
        <div 
          className="absolute overflow-visible"
          style={{ 
            left: chartPadding.left, 
            right: chartPadding.right, 
            top: chartPadding.top, 
            bottom: chartPadding.bottom 
          }}
        >
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {/* Horizontal grid lines */}
            {[0, 25, 50, 75, 100].map((percent) => (
              <line
                key={`h-${percent}`}
                x1="0%"
                y1={`${100 - percent}%`}
                x2="100%"
                y2={`${100 - percent}%`}
                stroke="currentColor"
                strokeWidth="1"
                className="text-border/30"
              />
            ))}
            {/* Vertical grid lines */}
            {[0, 25, 50, 75, 100].map((percent) => (
              <line
                key={`v-${percent}`}
                x1={`${percent}%`}
                y1="0%"
                x2={`${percent}%`}
                y2="100%"
                stroke="currentColor"
                strokeWidth="1"
                className="text-border/30"
              />
            ))}
          </svg>

          {/* Origin point */}
          <div 
            className="absolute z-20"
            style={{ left: 0, bottom: 0, transform: 'translate(-50%, 50%)' }}
          >
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-muted-foreground/20 border-2 border-muted-foreground flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">Start from 0</span>
            </div>
          </div>

          {/* SVG for paths */}
          <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(142 76% 36%)" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Target path (dashed) */}
            <polyline
              points={generateFullPath()}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="8,6"
              className="text-border"
              vectorEffect="non-scaling-stroke"
            />

            {/* Progress path (solid) */}
            <motion.polyline
              points={generatePath()}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>

          {/* Course nodes */}
          {chartData.courses.map((course, index) => {
            const x = toChartX(course.isCompleted ? course.endHours : course.currentHours);
            const y = toChartY(course.isCompleted ? course.endReadiness : course.currentReadiness);
            
            return (
              <motion.div
                key={course.id}
                className="absolute z-30"
                style={{ 
                  left: `${x}%`, 
                  top: `${y}%`, 
                  transform: 'translate(-50%, -50%)' 
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
              >
                <div
                  onClick={() => !course.isLocked && navigate(`/course/${course.slug}`)}
                  className={cn(
                    "relative group cursor-pointer transition-all duration-200",
                    course.isLocked && "cursor-not-allowed"
                  )}
                >
                  {/* Node circle */}
                  <div 
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform",
                      course.isCompleted && "bg-green-500 border-green-400 text-white",
                      course.isActive && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                      course.isLocked && "bg-muted border-muted-foreground/30 text-muted-foreground",
                      !course.isCompleted && !course.isActive && !course.isLocked && "bg-muted border-border text-muted-foreground",
                      !course.isLocked && "hover:scale-110"
                    )}
                  >
                    {course.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : course.isLocked ? (
                      <Lock className="h-4 w-4" />
                    ) : course.isActive ? (
                      <Play className="h-4 w-4 fill-current" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>

                  {/* Active course indicator */}
                  {course.isActive && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Sparkles className="h-2.5 w-2.5 text-primary-foreground" />
                    </motion.div>
                  )}

                  {/* Tooltip on hover */}
                  <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 rounded-lg",
                    "bg-popover border border-border shadow-lg",
                    "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                    "min-w-[180px] z-50"
                  )}>
                    <div className="font-medium text-sm">{course.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {course.isLocked ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Lock className="h-3 w-3" />
                          Complete previous course first
                        </span>
                      ) : course.isCompleted ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          {Math.round(course.contribution)}% Career Readiness
                        </span>
                      ) : (
                        <>
                          <Progress value={course.progress} className="h-1.5 mt-1" />
                          <span className="block mt-1">{course.completedLessons}/{course.lessonCount} lessons</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Milestone markers */}
          {milestones.map((milestone) => {
            const isReached = readinessPercent >= milestone.percent;
            return (
              <motion.div
                key={milestone.percent}
                className="absolute z-20"
                style={{ 
                  right: -30, 
                  top: `${100 - milestone.percent}%`, 
                  transform: 'translateY(-50%)' 
                }}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1 + milestone.percent * 0.01 }}
              >
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                  isReached 
                    ? "bg-primary/20 text-primary border border-primary/30" 
                    : "bg-muted text-muted-foreground border border-border"
                )}>
                  <span>{milestone.emoji}</span>
                </div>
              </motion.div>
            );
          })}

          {/* Goal indicator */}
          <div 
            className="absolute z-20"
            style={{ right: 0, top: 0, transform: 'translate(50%, -50%)' }}
          >
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg px-3 py-1">
              <Trophy className="h-3 w-3 mr-1" />
              Job Ready
            </Badge>
          </div>
        </div>
      </div>

      {/* Course List (Sequential) */}
      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Course Sequence</h4>
        <div className="grid gap-2">
          {chartData.courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * index }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                course.isActive && "bg-primary/5 border-primary/30 ring-1 ring-primary/20",
                course.isCompleted && "bg-green-500/5 border-green-500/30",
                course.isLocked && "bg-muted/50 border-border opacity-60",
                !course.isCompleted && !course.isActive && !course.isLocked && "bg-card border-border"
              )}
            >
              {/* Order number */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                course.isCompleted && "bg-green-500 text-white",
                course.isActive && "bg-primary text-primary-foreground",
                course.isLocked && "bg-muted text-muted-foreground",
                !course.isCompleted && !course.isActive && !course.isLocked && "bg-muted text-muted-foreground"
              )}>
                {course.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : course.isLocked ? <Lock className="h-3 w-3" /> : index + 1}
              </div>

              {/* Course info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-medium truncate",
                    course.isLocked && "text-muted-foreground"
                  )}>
                    {course.name}
                  </span>
                  {course.isActive && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{Math.round(course.contribution)}% contribution</span>
                  <span>{Math.round(course.hours)}h</span>
                  {!course.isLocked && (
                    <span>{course.completedLessons}/{course.lessonCount} lessons</span>
                  )}
                </div>
              </div>

              {/* Progress/Status */}
              <div className="shrink-0">
                {course.isCompleted ? (
                  <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                    Completed
                  </Badge>
                ) : course.isActive ? (
                  <div className="text-right">
                    <div className="text-sm font-medium text-primary">{course.progress}%</div>
                    <Progress value={course.progress} className="h-1 w-20" />
                  </div>
                ) : course.isLocked ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate(`/course/${course.slug}`)}
                  >
                    Start
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-4 text-xs">
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
          <span className="text-muted-foreground">Active Course</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-muted border border-muted-foreground/30 flex items-center justify-center">
            <Lock className="h-2 w-2 text-muted-foreground" />
          </div>
          <span className="text-muted-foreground">Locked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-0.5 bg-border" style={{ borderTop: '2px dashed' }} />
          <span className="text-muted-foreground">Target Path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-0.5 bg-gradient-to-r from-primary to-green-500 rounded" />
          <span className="text-muted-foreground">Your Progress</span>
        </div>
      </div>
    </div>
  );
};
