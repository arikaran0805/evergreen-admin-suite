import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Lock, 
  CheckCircle2, 
  Play, 
  Trophy, 
  Target, 
  Rocket, 
  Sparkles,
  ChevronRight
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
  contributionPercent?: number;
  learningHours?: number;
}

interface CareerProgressChartProps {
  journeySteps: CourseStep[];
  readinessPercent: number;
  careerName: string;
  totalLearningHours?: number;
}

interface TooltipData {
  x: number;
  y: number;
  hours: number;
  readiness: number;
  courseName: string;
  phase: 'learning' | 'validation';
}

export const CareerProgressChart = ({ 
  journeySteps, 
  readinessPercent,
  careerName,
  totalLearningHours = 120 
}: CareerProgressChartProps) => {
  const navigate = useNavigate();
  const [showCelebration, setShowCelebration] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  // Build the complete path data for the career journey
  const pathData = useMemo(() => {
    if (journeySteps.length === 0) return {
      completePath: "",
      progressPath: "",
      futurePath: "",
      milestones: [],
      courses: [],
      currentX: 0,
      currentY: 0
    };

    const totalCourses = journeySteps.length;
    const defaultContribution = 100 / totalCourses;
    
    // Build course data with positions
    let cumulativeHours = 0;
    let cumulativeReadiness = 0;
    let activeIndex = -1;
    let foundActive = false;

    const courses = journeySteps.map((step, index) => {
      const contribution = step.contributionPercent || defaultContribution;
      const hours = step.learningHours || (totalLearningHours * (contribution / 100));
      
      // Learning phase takes 80% of course hours, validation takes 20%
      const learningHours = hours * 0.8;
      const validationHours = hours * 0.2;
      
      const previousCourse = index > 0 ? journeySteps[index - 1] : null;
      const isPreviousCompleted = index === 0 || (previousCourse?.isCompleted ?? false);
      const isLocked = !isPreviousCompleted && !step.isCompleted && !step.isStarted;
      const isActive = isPreviousCompleted && !step.isCompleted && !foundActive;
      
      if (isActive) {
        activeIndex = index;
        foundActive = true;
      }

      // Calculate course segment positions
      const startHours = cumulativeHours;
      const startReadiness = cumulativeReadiness;
      
      // Learning end point (after diagonal climb)
      const learningEndHours = startHours + learningHours;
      const learningEndReadiness = startReadiness + contribution;
      
      // Validation end point (flat line after learning)
      const validationEndHours = startHours + hours;
      const validationEndReadiness = learningEndReadiness; // Same Y - flat line
      
      // Progress within this course
      const courseProgress = step.progress / 100;
      let currentHoursInCourse = 0;
      let currentReadinessInCourse = 0;
      let isInValidation = false;
      
      if (step.isCompleted) {
        currentHoursInCourse = hours;
        currentReadinessInCourse = contribution;
      } else if (step.isStarted || isActive) {
        // If progress > 80%, we're in validation phase
        if (courseProgress > 0.8) {
          isInValidation = true;
          currentHoursInCourse = learningHours + (validationHours * ((courseProgress - 0.8) / 0.2));
          currentReadinessInCourse = contribution; // Already at max for this course
        } else {
          // Still in learning phase
          currentHoursInCourse = learningHours * (courseProgress / 0.8);
          currentReadinessInCourse = contribution * (courseProgress / 0.8);
        }
      }
      
      const result = {
        ...step,
        contribution,
        hours,
        learningHours,
        validationHours,
        startHours,
        startReadiness,
        learningEndHours,
        learningEndReadiness,
        validationEndHours,
        validationEndReadiness,
        currentHours: startHours + currentHoursInCourse,
        currentReadiness: startReadiness + currentReadinessInCourse,
        isLocked,
        isActive,
        isInValidation,
      };
      
      cumulativeHours += hours;
      cumulativeReadiness += contribution;
      
      return result;
    });

    // Generate SVG paths
    const toX = (h: number) => (h / totalLearningHours) * 100;
    const toY = (r: number) => 100 - r;

    // Complete path (full journey - dashed for future)
    let completePathPoints = [`M 0 100`]; // Start at origin
    courses.forEach(course => {
      // Diagonal up (learning phase)
      completePathPoints.push(`L ${toX(course.learningEndHours)} ${toY(course.learningEndReadiness)}`);
      // Horizontal (validation phase)
      completePathPoints.push(`L ${toX(course.validationEndHours)} ${toY(course.validationEndReadiness)}`);
    });
    const completePath = completePathPoints.join(' ');

    // Progress path (what the learner has completed)
    let progressPathPoints = [`M 0 100`];
    let lastProgressX = 0;
    let lastProgressY = 100;
    
    for (const course of courses) {
      if (course.isCompleted) {
        // Full course completed
        progressPathPoints.push(`L ${toX(course.learningEndHours)} ${toY(course.learningEndReadiness)}`);
        progressPathPoints.push(`L ${toX(course.validationEndHours)} ${toY(course.validationEndReadiness)}`);
        lastProgressX = toX(course.validationEndHours);
        lastProgressY = toY(course.validationEndReadiness);
      } else if (course.isActive || course.isStarted) {
        // Partial progress
        if (course.isInValidation) {
          // Completed learning, partial validation
          progressPathPoints.push(`L ${toX(course.learningEndHours)} ${toY(course.learningEndReadiness)}`);
          progressPathPoints.push(`L ${toX(course.currentHours)} ${toY(course.currentReadiness)}`);
        } else {
          // Still in learning phase
          progressPathPoints.push(`L ${toX(course.currentHours)} ${toY(course.currentReadiness)}`);
        }
        lastProgressX = toX(course.currentHours);
        lastProgressY = toY(course.currentReadiness);
        break;
      } else {
        break;
      }
    }
    const progressPath = progressPathPoints.join(' ');

    // Future path (remaining journey - will be shown as dashed)
    let futurePathPoints: string[] = [];
    let startedFuture = false;
    
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      
      if (!course.isCompleted && !course.isActive && !course.isStarted) {
        if (!startedFuture) {
          // Start from the last progress point
          const prevCourse = courses[i - 1];
          if (prevCourse) {
            futurePathPoints.push(`M ${toX(prevCourse.validationEndHours)} ${toY(prevCourse.validationEndReadiness)}`);
          } else {
            futurePathPoints.push(`M 0 100`);
          }
          startedFuture = true;
        }
        futurePathPoints.push(`L ${toX(course.learningEndHours)} ${toY(course.learningEndReadiness)}`);
        futurePathPoints.push(`L ${toX(course.validationEndHours)} ${toY(course.validationEndReadiness)}`);
      } else if (course.isActive || course.isStarted) {
        // Continue from current progress point
        futurePathPoints.push(`M ${toX(course.currentHours)} ${toY(course.currentReadiness)}`);
        if (course.isInValidation) {
          futurePathPoints.push(`L ${toX(course.validationEndHours)} ${toY(course.validationEndReadiness)}`);
        } else {
          futurePathPoints.push(`L ${toX(course.learningEndHours)} ${toY(course.learningEndReadiness)}`);
          futurePathPoints.push(`L ${toX(course.validationEndHours)} ${toY(course.validationEndReadiness)}`);
        }
        startedFuture = true;
      }
    }
    const futurePath = futurePathPoints.join(' ');

    // Calculate milestones (attached to the line)
    const milestones = [
      { x: 0, y: 100, label: "Started", emoji: "🎯", reached: true },
      { 
        x: toX(60), 
        y: toY(50), 
        label: "Halfway", 
        emoji: "🚀", 
        reached: readinessPercent >= 50 
      },
      { 
        x: 100, 
        y: 0, 
        label: "Career Ready", 
        emoji: "🏆", 
        reached: readinessPercent >= 100 
      },
    ];

    return {
      completePath,
      progressPath,
      futurePath,
      milestones,
      courses,
      currentX: lastProgressX,
      currentY: lastProgressY,
      activeIndex
    };
  }, [journeySteps, totalLearningHours, readinessPercent]);

  // Check for completion celebration
  useEffect(() => {
    if (readinessPercent === 100) {
      setShowCelebration(true);
    }
  }, [readinessPercent]);

  // Handle mouse movement for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartAreaRef.current || pathData.courses.length === 0) return;
    
    const rect = chartAreaRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const chartWidth = rect.width;
    const chartHeight = rect.height;
    
    // Convert mouse X to hours
    const xPercent = Math.max(0, Math.min(100, (mouseX / chartWidth) * 100));
    const hours = (xPercent / 100) * totalLearningHours;
    
    // Find which course this hour falls into and calculate readiness
    let readiness = 0;
    let courseName = "";
    let phase: 'learning' | 'validation' = 'learning';
    
    for (const course of pathData.courses) {
      if (hours <= course.validationEndHours) {
        courseName = course.name;
        
        if (hours <= course.learningEndHours) {
          // In learning phase - diagonal part
          phase = 'learning';
          const progressInCourse = (hours - course.startHours) / course.learningHours;
          readiness = course.startReadiness + (course.contribution * progressInCourse);
        } else {
          // In validation phase - flat part
          phase = 'validation';
          readiness = course.learningEndReadiness;
        }
        break;
      }
      readiness = course.validationEndReadiness;
    }
    
    // Calculate Y position on the line
    const yPercent = 100 - readiness;
    const lineY = (yPercent / 100) * chartHeight;
    
    // Only show tooltip if mouse is near the line (within 30px)
    const distanceToLine = Math.abs(mouseY - lineY);
    if (distanceToLine < 30) {
      setTooltip({
        x: mouseX,
        y: lineY,
        hours: Math.round(hours * 10) / 10,
        readiness: Math.round(readiness * 10) / 10,
        courseName,
        phase
      });
    } else {
      setTooltip(null);
    }
  }, [pathData.courses, totalLearningHours]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const chartHeight = 400;
  const chartPadding = { top: 50, right: 60, bottom: 70, left: 70 };

  return (
    <div className="relative bg-card rounded-2xl border border-border overflow-hidden">
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
              className="text-center"
            >
              <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ duration: 0.5, repeat: 3 }}>
                <Trophy className="h-24 w-24 mx-auto text-amber-500 drop-shadow-lg" />
              </motion.div>
              <h2 className="text-3xl font-bold mt-4 bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                100% Career Readiness Achieved!
              </h2>
              <p className="text-muted-foreground mt-2">You've completed all courses in the {careerName} path</p>
              <Button variant="outline" className="mt-6" onClick={() => setShowCelebration(false)}>Continue</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-border">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="text-foreground">Career Chart</span>
            <Badge variant="outline" className="font-normal">{careerName}</Badge>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sequential skill mastery — strong foundations unlock future success
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{Math.round(readinessPercent)}%</div>
            <div className="text-xs text-muted-foreground">Career Readiness</div>
          </div>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
            {readinessPercent >= 100 ? (
              <Trophy className="h-7 w-7 text-amber-500" />
            ) : readinessPercent >= 50 ? (
              <Rocket className="h-7 w-7 text-primary" />
            ) : (
              <Target className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="p-6">
        <div 
          className="relative bg-muted/30 rounded-xl"
          style={{ height: `${chartHeight}px` }}
        >
          {/* Y-Axis Label */}
          <div 
            className="absolute text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            style={{ 
              left: 8, 
              top: '50%', 
              transform: 'rotate(-90deg) translateX(50%)',
              transformOrigin: 'left center',
              whiteSpace: 'nowrap'
            }}
          >
            % Readiness
          </div>

          {/* Y-Axis Ticks */}
          <div 
            className="absolute flex flex-col justify-between text-xs font-medium text-muted-foreground"
            style={{ 
              left: chartPadding.left - 35, 
              top: chartPadding.top, 
              bottom: chartPadding.bottom,
              width: 30,
              textAlign: 'right'
            }}
          >
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          {/* X-Axis Label */}
          <div 
            className="absolute text-xs font-semibold text-muted-foreground text-center uppercase tracking-wider"
            style={{ 
              bottom: 12, 
              left: chartPadding.left, 
              right: chartPadding.right 
            }}
          >
            Learning Hours
          </div>

          {/* X-Axis Ticks */}
          <div 
            className="absolute flex justify-between text-xs font-medium text-muted-foreground"
            style={{ 
              left: chartPadding.left, 
              right: chartPadding.right, 
              bottom: chartPadding.bottom - 25 
            }}
          >
            <span>0h</span>
            <span>30h</span>
            <span>60h</span>
            <span>90h</span>
            <span>120h</span>
          </div>

          {/* Chart Area */}
          <div 
            ref={chartAreaRef}
            className="absolute cursor-crosshair"
            style={{ 
              left: chartPadding.left, 
              right: chartPadding.right, 
              top: chartPadding.top, 
              bottom: chartPadding.bottom 
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Grid lines - horizontal dashed */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {[0, 25, 50, 75, 100].map((percent) => (
                <line
                  key={`h-${percent}`}
                  x1="0%"
                  y1={`${100 - percent}%`}
                  x2="100%"
                  y2={`${100 - percent}%`}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  className="text-muted-foreground/15"
                />
              ))}
            </svg>

            {/* Main SVG for the career line */}
            <svg 
              className="absolute inset-0 w-full h-full overflow-visible" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
            >
              <defs>
                {/* Gradient for progress line */}
                <linearGradient id="progressGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(142 76% 46%)" />
                </linearGradient>
                {/* Glow effect */}
                <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Background trace of progress path (shows where line will draw) */}
              <path
                d={pathData.progressPath}
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeOpacity="0.1"
                className="text-primary"
                vectorEffect="non-scaling-stroke"
              />

              {/* Future path (dashed, muted) */}
              {pathData.futurePath && (
                <motion.path
                  d={pathData.futurePath}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                  className="text-muted-foreground/30"
                  vectorEffect="non-scaling-stroke"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.2, duration: 0.5 }}
                />
              )}

              {/* Progress path (solid, gradient) - THE HERO LINE with drawing animation */}
              <motion.path
                d={pathData.progressPath}
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lineGlow)"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ 
                  duration: 2.5, 
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.3
                }}
                style={{ pathLength: 1 }}
              />

              {/* Animated drawing head (glowing dot that travels along the path) */}
              <motion.circle
                r="1.5"
                fill="hsl(var(--primary))"
                filter="url(#lineGlow)"
                initial={{ opacity: 1 }}
                animate={{ 
                  opacity: [1, 1, 0],
                  offsetDistance: ['0%', '100%', '100%']
                }}
                transition={{ 
                  duration: 2.8,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.3,
                  times: [0, 0.9, 1]
                }}
                style={{
                  offsetPath: `path('${pathData.progressPath}')`,
                  offsetRotate: '0deg'
                }}
              />
            </svg>

            {/* Interactive Tooltip */}
            <AnimatePresence>
              {tooltip && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-50 pointer-events-none"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                    transform: 'translate(-50%, -120%)'
                  }}
                >
                  <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-sm">
                    <div className="font-semibold text-foreground">{tooltip.courseName}</div>
                    <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                      <span className="font-medium">{tooltip.hours}h</span>
                      <span>•</span>
                      <span className="text-primary font-medium">{tooltip.readiness}%</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                      {tooltip.phase === 'learning' ? '📚 Learning' : '✓ Validation'}
                    </div>
                    {/* Arrow */}
                    <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-border" />
                    <div className="absolute left-1/2 bottom-0.5 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-popover" />
                  </div>
                  {/* Vertical line to point */}
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 top-full w-px bg-primary/50"
                    style={{ height: '8px' }}
                  />
                  {/* Dot on line */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-md" style={{ top: 'calc(100% + 8px)', transform: 'translate(-50%, -50%)' }} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Origin point - Start from 0 */}
            <div 
              className="absolute z-30"
              style={{ left: 0, bottom: 0, transform: 'translate(-50%, 50%)' }}
            >
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-foreground mb-1 whitespace-nowrap">Start from 0</span>
                <motion.div 
                  className="w-5 h-5 rounded-full bg-primary border-2 border-primary-foreground shadow-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                </motion.div>
                <span className="text-[10px] text-amber-500 font-medium mt-1 flex items-center gap-0.5">
                  🎯 <span className="uppercase tracking-wide">Started</span>
                </span>
              </div>
            </div>

            {/* Current progress indicator (pulsing dot) */}
            {pathData.currentX > 0 && pathData.currentY < 100 && (
              <motion.div
                className="absolute z-40"
                style={{ 
                  left: `${pathData.currentX}%`, 
                  top: `${pathData.currentY}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.5 }}
              >
                <motion.div
                  className="w-4 h-4 rounded-full bg-primary border-2 border-background shadow-lg"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.div>
            )}

            {/* Course completion markers (small dots on the line) */}
            {pathData.courses.map((course, index) => {
              if (!course.isCompleted) return null;
              
              const x = (course.validationEndHours / totalLearningHours) * 100;
              const y = 100 - course.validationEndReadiness;
              
              return (
                <motion.div
                  key={course.id}
                  className="absolute z-20 group"
                  style={{ 
                    left: `${x}%`, 
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8 + index * 0.2 }}
                >
                  <div className="w-3 h-3 rounded-full bg-green-500 border border-green-400 shadow-sm" />
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded bg-popover border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs z-50">
                    <span className="font-medium">{course.name}</span>
                    <span className="text-green-500 ml-1">✓ {Math.round(course.contribution)}%</span>
                  </div>
                </motion.div>
              );
            })}

            {/* Halfway milestone (attached to line at ~60h, 50%) */}
            <motion.div
              className="absolute z-20"
              style={{ 
                left: '50%', 
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                  readinessPercent >= 50 
                    ? "bg-primary/20 border-primary" 
                    : "bg-muted/50 border-muted-foreground/30"
                )}>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    readinessPercent >= 50 ? "bg-primary" : "bg-muted-foreground/40"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium mt-1 flex items-center gap-0.5",
                  readinessPercent >= 50 ? "text-primary" : "text-muted-foreground"
                )}>
                  🚀 <span className="uppercase tracking-wide">Halfway</span>
                </span>
              </div>
            </motion.div>

            {/* Career Ready milestone (at 120h, 100%) */}
            <motion.div
              className="absolute z-20"
              style={{ right: 0, top: 0, transform: 'translate(50%, -50%)' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                  readinessPercent >= 100 
                    ? "bg-amber-500/20 border-amber-500" 
                    : "bg-muted/50 border-muted-foreground/30"
                )}>
                  {readinessPercent >= 100 ? (
                    <Trophy className="h-3 w-3 text-amber-500" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium mt-1 flex items-center gap-0.5 whitespace-nowrap",
                  readinessPercent >= 100 ? "text-amber-500" : "text-muted-foreground"
                )}>
                  🏆 <span className="uppercase tracking-wide">Career Ready</span>
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Course Sequence List */}
      <div className="px-6 pb-6">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Course Sequence</h4>
        <div className="grid gap-2">
          {pathData.courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.05 * index }}
              onClick={() => !course.isLocked && navigate(`/course/${course.slug}`)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                course.isActive && "bg-primary/5 border-primary/30 ring-1 ring-primary/20",
                course.isCompleted && "bg-green-500/5 border-green-500/30",
                course.isLocked && "bg-muted/30 border-border/50 opacity-50 cursor-not-allowed",
                !course.isCompleted && !course.isActive && !course.isLocked && "bg-card border-border hover:border-primary/30"
              )}
            >
              {/* Status indicator */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                course.isCompleted && "bg-green-500 text-white",
                course.isActive && "bg-primary text-primary-foreground",
                course.isLocked && "bg-muted text-muted-foreground",
                !course.isCompleted && !course.isActive && !course.isLocked && "bg-muted text-muted-foreground"
              )}>
                {course.isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : course.isLocked ? (
                  <Lock className="h-3 w-3" />
                ) : course.isActive ? (
                  <Play className="h-3 w-3 fill-current" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Course info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium truncate", course.isLocked && "text-muted-foreground")}>
                    {course.name}
                  </span>
                  {course.isActive && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">Active</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{Math.round(course.contribution)}% contribution</span>
                  <span>{Math.round(course.hours)}h</span>
                </div>
              </div>

              {/* Progress/Status */}
              <div className="shrink-0">
                {course.isCompleted ? (
                  <Badge className="bg-green-500/20 text-green-600 border-green-500/30">✓ Completed</Badge>
                ) : course.isActive ? (
                  <div className="text-right">
                    <div className="text-sm font-medium text-primary">{course.progress}%</div>
                    <Progress value={course.progress} className="h-1 w-16" />
                  </div>
                ) : course.isLocked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 pb-6 pt-2 border-t border-border flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 bg-gradient-to-r from-primary to-green-500 rounded" />
          <span className="text-muted-foreground">Your Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 border-t-2 border-dashed border-muted-foreground/30" />
          <span className="text-muted-foreground">Remaining Path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Completed Course</span>
        </div>
      </div>
    </div>
  );
};
