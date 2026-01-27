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
  ChevronRight,
  RotateCcw,
  ArrowUp,
  MapPin,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

// Session storage key for career flow (must match useUserState)
const ENTRY_FLOW_KEY = "lovable_entry_flow";

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
  courseSlug: string;
  phase: 'learning' | 'validation';
  completedLessons: number;
  lessonCount: number;
  nextLessonNumber: number;
  isCompleted: boolean;
  progress: number;
  courseIndex: number;
  isLocked: boolean;
  isActive: boolean;
  isEnrolled: boolean;
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
  const [animationKey, setAnimationKey] = useState(0);
  const [isLineHovered, setIsLineHovered] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState<{ x: number; y: number; key: number } | null>(null);
  const [interpolatedDotPosition, setInterpolatedDotPosition] = useState<{ x: number; y: number } | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completedCourseInfo, setCompletedCourseInfo] = useState<{name: string; slug: string} | null>(null);
  const lastCompletedHoverRef = useRef<string | null>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const progressPathRef = useRef<SVGPathElement>(null);

  const handleReplayAnimation = useCallback(() => {
    setAnimationKey(prev => prev + 1);
  }, []);

  // Build the complete path data for the career journey with sharp upward segments
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

    // Generate SVG paths with SHARP lines (no curves) for upward growth effect
    const toX = (h: number) => (h / totalLearningHours) * 100;
    const toY = (r: number) => 100 - r;

    // Helper to create SHARP path (only L commands, no curves)
    const createSharpPath = (points: { x: number; y: number }[]): string => {
      if (points.length < 2) return '';
      
      let path = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
      
      return path;
    };

    // Build complete path points with sharp zigzag upward pattern
    const completePoints: { x: number; y: number }[] = [{ x: 0, y: 100 }];
    courses.forEach(course => {
      // Sharp upward climb during learning
      completePoints.push({ x: toX(course.learningEndHours), y: toY(course.learningEndReadiness) });
      // Flat validation segment
      completePoints.push({ x: toX(course.validationEndHours), y: toY(course.validationEndReadiness) });
    });
    const completePath = createSharpPath(completePoints);

    // Build progress path points
    const progressPoints: { x: number; y: number }[] = [{ x: 0, y: 100 }];
    let lastProgressX = 0;
    let lastProgressY = 100;
    
    for (const course of courses) {
      if (course.isCompleted) {
        progressPoints.push({ x: toX(course.learningEndHours), y: toY(course.learningEndReadiness) });
        progressPoints.push({ x: toX(course.validationEndHours), y: toY(course.validationEndReadiness) });
        lastProgressX = toX(course.validationEndHours);
        lastProgressY = toY(course.validationEndReadiness);
      } else if (course.isActive || course.isStarted) {
        if (course.isInValidation) {
          progressPoints.push({ x: toX(course.learningEndHours), y: toY(course.learningEndReadiness) });
          progressPoints.push({ x: toX(course.currentHours), y: toY(course.currentReadiness) });
        } else {
          progressPoints.push({ x: toX(course.currentHours), y: toY(course.currentReadiness) });
        }
        lastProgressX = toX(course.currentHours);
        lastProgressY = toY(course.currentReadiness);
        break;
      } else {
        break;
      }
    }
    const progressPath = createSharpPath(progressPoints);

    // Build future path points
    const futurePoints: { x: number; y: number }[] = [];
    let startedFuture = false;
    
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      
      if (!course.isCompleted && !course.isActive && !course.isStarted) {
        if (!startedFuture) {
          const prevCourse = courses[i - 1];
          if (prevCourse) {
            futurePoints.push({ x: toX(prevCourse.validationEndHours), y: toY(prevCourse.validationEndReadiness) });
          } else {
            futurePoints.push({ x: 0, y: 100 });
          }
          startedFuture = true;
        }
        futurePoints.push({ x: toX(course.learningEndHours), y: toY(course.learningEndReadiness) });
        futurePoints.push({ x: toX(course.validationEndHours), y: toY(course.validationEndReadiness) });
      } else if (course.isActive || course.isStarted) {
        futurePoints.push({ x: toX(course.currentHours), y: toY(course.currentReadiness) });
        if (course.isInValidation) {
          futurePoints.push({ x: toX(course.validationEndHours), y: toY(course.validationEndReadiness) });
        } else {
          futurePoints.push({ x: toX(course.learningEndHours), y: toY(course.learningEndReadiness) });
          futurePoints.push({ x: toX(course.validationEndHours), y: toY(course.validationEndReadiness) });
        }
        startedFuture = true;
      }
    }
    const futurePath = futurePoints.length >= 2 ? createSharpPath(futurePoints) : '';

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

  // Interpolate dot position along the actual SVG path curve
  useEffect(() => {
    if (!progressPathRef.current || pathData.currentX <= 0 || readinessPercent >= 100) {
      setInterpolatedDotPosition(null);
      return;
    }

    const path = progressPathRef.current;
    const totalLength = path.getTotalLength();
    
    // Get the point at the end of the path (current progress position)
    const point = path.getPointAtLength(totalLength);
    
    // Convert from SVG viewBox coordinates (0-100) to percentage
    setInterpolatedDotPosition({ x: point.x, y: point.y });
  }, [pathData.progressPath, pathData.currentX, readinessPercent, animationKey]);

  // Handle click on course - with proper locking and navigation logic
  // ALWAYS sets career flow since we're navigating FROM Career Board/Arcade
  const handleCourseClick = useCallback((course: typeof pathData.courses[0], courseIndex: number) => {
    // Check if locked - show toast and prevent navigation
    if (course.isLocked) {
      toast({
        title: "Course Locked 🔒",
        description: "Complete the previous course to unlock this.",
        variant: "destructive",
      });
      return;
    }

    // Set career flow BEFORE navigation - this shows CareerScopedHeader
    sessionStorage.setItem(ENTRY_FLOW_KEY, "career_flow");

    // Check if completed - show completion dialog
    if (course.isCompleted) {
      setCompletedCourseInfo({ name: course.name, slug: course.slug });
      setShowCompletionDialog(true);
      return;
    }

    // Enrolled but not completed - navigate to next lesson
    if (course.isEnrolled && course.progress > 0) {
      navigate(`/course/${course.slug}?continue=true`);
      return;
    }

    // Active or not started - navigate to course
    navigate(`/course/${course.slug}`);
  }, [navigate]);

  // Handle restart course from completion dialog
  const handleRestartCourse = useCallback(() => {
    if (completedCourseInfo) {
      // Set career flow for restart as well
      sessionStorage.setItem(ENTRY_FLOW_KEY, "career_flow");
      navigate(`/course/${completedCourseInfo.slug}?restart=true`);
    }
    setShowCompletionDialog(false);
  }, [completedCourseInfo, navigate]);

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
    let courseSlug = "";
    let phase: 'learning' | 'validation' = 'learning';
    let completedLessons = 0;
    let lessonCount = 0;
    let isCompleted = false;
    let progress = 0;
    let courseIndex = 0;
    let isLocked = false;
    let isActive = false;
    let isEnrolled = false;
    
    for (let i = 0; i < pathData.courses.length; i++) {
      const course = pathData.courses[i];
      if (hours <= course.validationEndHours) {
        courseName = course.name;
        courseSlug = course.slug;
        completedLessons = course.completedLessons;
        lessonCount = course.lessonCount;
        isCompleted = course.isCompleted;
        progress = course.progress;
        courseIndex = i;
        isLocked = course.isLocked;
        isActive = course.isActive;
        isEnrolled = course.isEnrolled;
        
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
      courseSlug = course.slug;
      courseName = course.name;
      completedLessons = course.completedLessons;
      lessonCount = course.lessonCount;
      isCompleted = course.isCompleted;
      progress = course.progress;
      courseIndex = i;
      isLocked = course.isLocked;
      isActive = course.isActive;
      isEnrolled = course.isEnrolled;
    }
    
    // Calculate Y position on the line
    const yPercent = 100 - readiness;
    const lineY = (yPercent / 100) * chartHeight;
    
    // Only show tooltip if mouse is near the line (within 30px)
    const distanceToLine = Math.abs(mouseY - lineY);
    if (distanceToLine < 30) {
      const nextLessonNumber = Math.min(completedLessons + 1, lessonCount);
      
      // Trigger confetti burst when first entering a completed course section
      if (isCompleted && lastCompletedHoverRef.current !== courseSlug) {
        lastCompletedHoverRef.current = courseSlug;
        setConfettiBurst({ x: mouseX, y: lineY, key: Date.now() });
      } else if (!isCompleted) {
        lastCompletedHoverRef.current = null;
      }
      
      setTooltip({
        x: mouseX,
        y: lineY,
        hours: Math.round(hours * 10) / 10,
        readiness: Math.round(readiness * 10) / 10,
        courseName,
        courseSlug,
        phase,
        completedLessons,
        lessonCount,
        nextLessonNumber,
        isCompleted,
        progress,
        courseIndex,
        isLocked,
        isActive,
        isEnrolled
      });
    } else {
      setTooltip(null);
      lastCompletedHoverRef.current = null;
    }
  }, [pathData.courses, totalLearningHours]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    lastCompletedHoverRef.current = null;
  }, []);

  // Handle click to navigate to course with proper locking logic
  const handleClick = useCallback(() => {
    if (tooltip) {
      const course = pathData.courses[tooltip.courseIndex];
      if (course) {
        handleCourseClick(course, tooltip.courseIndex);
      }
    }
  }, [tooltip, pathData.courses, handleCourseClick]);

  const chartHeight = 500;
  const chartPadding = { top: 50, right: 60, bottom: 70, left: 70 };

  return (
    <div className="relative bg-card rounded-2xl border border-border overflow-hidden">
      {/* Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
              Congratulations <span className="text-3xl">🎉</span>
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              You have completed this course.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={handleRestartCourse}
              className="w-full gap-2"
              variant="default"
            >
              <RotateCcw className="h-4 w-4" />
              Restart Course
            </Button>
            <Button
              onClick={() => setShowCompletionDialog(false)}
              variant="outline"
              className="w-full gap-2"
            >
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReplayAnimation}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay
          </Button>
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
            <span></span>
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
            <span></span>
            <span>30h</span>
            <span>60h</span>
            <span>90h</span>
            <span>120h</span>
          </div>

          {/* Chart Area */}
          <div 
            ref={chartAreaRef}
            className={cn(
              "absolute transition-cursor duration-150",
              tooltip ? "cursor-pointer" : "cursor-crosshair"
            )}
            style={{ 
              left: chartPadding.left, 
              right: chartPadding.right, 
              top: chartPadding.top, 
              bottom: chartPadding.bottom 
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
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
                {/* Upward arrow marker for progress line end (no horizontal bar) */}
                <marker
                  id="progressArrow"
                  viewBox="0 0 24 28"
                  refX="12"
                  refY="28"
                  markerWidth="18"
                  markerHeight="22"
                  orient="0"
                  markerUnits="userSpaceOnUse"
                >
                  <path
                    d="M12 2 L22 12 M12 2 L2 12 M12 10 L12 28"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </marker>
                {/* Glow effect */}
                <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                {/* Enhanced glow effect for hover */}
                <filter id="lineGlowHover" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
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
                strokeWidth="5"
                strokeOpacity="0.15"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
                vectorEffect="non-scaling-stroke"
              />

              {/* Future path (solid, muted) */}
              {pathData.futurePath && (
                <motion.path
                  key={`future-${animationKey}`}
                  d={pathData.futurePath}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground/20"
                  vectorEffect="non-scaling-stroke"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.2, duration: 0.5 }}
                />
              )}

              {/* Hidden path for getPointAtLength interpolation */}
              <path
                ref={progressPathRef}
                d={pathData.progressPath}
                fill="none"
                stroke="none"
                style={{ visibility: 'hidden' }}
              />

              {/* Progress path (solid, gradient) - THE HERO LINE with drawing animation and arrow */}
              <motion.path
                key={`progress-${animationKey}`}
                d={pathData.progressPath}
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lineGlow)"
                vectorEffect="non-scaling-stroke"
                markerEnd="url(#progressArrow)"
                initial={{ pathLength: 0 }}
                animate={{ 
                  pathLength: 1,
                  strokeWidth: isLineHovered ? 7 : 5,
                  filter: isLineHovered ? "url(#lineGlowHover)" : "url(#lineGlow)"
                }}
                transition={{ 
                  pathLength: { duration: 2.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 },
                  strokeWidth: { duration: 0.2, ease: "easeOut" },
                  filter: { duration: 0.2 }
                }}
                style={{ pathLength: 1 }}
              />

              {/* Invisible wider hit area for easier hover */}
              <path
                d={pathData.progressPath}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer"
                onMouseEnter={() => setIsLineHovered(true)}
                onMouseLeave={() => setIsLineHovered(false)}
                style={{ pointerEvents: 'stroke' }}
              />

              {/* Particle trail effects */}
              {[...Array(8)].map((_, i) => (
                <motion.circle
                  key={`particle-${animationKey}-${i}`}
                  r={0.8 - i * 0.08}
                  fill="hsl(var(--primary))"
                  opacity={0.6 - i * 0.07}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 0.6 - i * 0.07, 0.6 - i * 0.07, 0],
                    offsetDistance: ['0%', '100%', '100%']
                  }}
                  transition={{ 
                    duration: 2.8,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.3 + (i * 0.06),
                    times: [0, 0.05, 0.9, 1]
                  }}
                  style={{
                    offsetPath: `path('${pathData.progressPath}')`,
                    offsetRotate: '0deg'
                  }}
                />
              ))}

              {/* Sparkle particles that burst periodically */}
              {[...Array(12)].map((_, i) => (
                <motion.circle
                  key={`sparkle-${animationKey}-${i}`}
                  r={0.4}
                  fill="hsl(142 76% 66%)"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 0, 1, 0],
                    scale: [0, 0, 1.5, 0],
                    offsetDistance: [`${(i + 1) * 8}%`, `${(i + 1) * 8}%`, `${(i + 1) * 8}%`, `${(i + 1) * 8}%`],
                    x: [0, 0, (i % 2 === 0 ? 1 : -1) * (2 + Math.random() * 2), (i % 2 === 0 ? 2 : -2) * 3],
                    y: [0, 0, (i % 3 === 0 ? -1 : 1) * (1 + Math.random() * 2), (i % 3 === 0 ? -3 : 3)]
                  }}
                  transition={{ 
                    duration: 2.8,
                    ease: "easeOut",
                    delay: 0.3 + (i * 0.2),
                    times: [0, (i + 1) * 0.075, (i + 1) * 0.075 + 0.02, (i + 1) * 0.075 + 0.15]
                  }}
                  style={{
                    offsetPath: `path('${pathData.progressPath}')`,
                    offsetRotate: '0deg'
                  }}
                />
              ))}

              {/* Animated drawing head (glowing dot that travels along the path) */}
              <motion.circle
                key={`head-${animationKey}`}
                r="1.8"
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
              
              {/* Inner bright core of drawing head */}
              <motion.circle
                key={`core-${animationKey}`}
                r="0.8"
                fill="white"
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
            {/* Confetti burst for completed sections */}
            <AnimatePresence>
              {confettiBurst && (
                <motion.div
                  key={confettiBurst.key}
                  className="absolute z-30 pointer-events-none"
                  style={{
                    left: confettiBurst.x,
                    top: confettiBurst.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  onAnimationComplete={() => setConfettiBurst(null)}
                >
                  {/* Confetti particles */}
                  {[...Array(12)].map((_, i) => {
                    const angle = (i / 12) * 360;
                    const distance = 30 + Math.random() * 25;
                    const size = 4 + Math.random() * 4;
                    const colors = [
                      'hsl(142, 76%, 46%)', // green
                      'hsl(var(--primary))',
                      'hsl(45, 93%, 58%)',  // gold
                      'hsl(280, 87%, 65%)', // purple
                      'hsl(190, 90%, 50%)', // cyan
                    ];
                    const color = colors[i % colors.length];
                    
                    return (
                      <motion.div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          width: size,
                          height: size,
                          backgroundColor: color,
                          boxShadow: `0 0 4px ${color}`,
                        }}
                        initial={{ 
                          x: 0, 
                          y: 0, 
                          scale: 0,
                          rotate: 0
                        }}
                        animate={{ 
                          x: Math.cos(angle * Math.PI / 180) * distance,
                          y: Math.sin(angle * Math.PI / 180) * distance - 20,
                          scale: [0, 1.2, 0.8, 0],
                          rotate: Math.random() * 360
                        }}
                        transition={{ 
                          duration: 0.8 + Math.random() * 0.4,
                          ease: "easeOut"
                        }}
                      />
                    );
                  })}
                  {/* Sparkle stars */}
                  {[...Array(6)].map((_, i) => {
                    const angle = (i / 6) * 360 + 30;
                    const distance = 20 + Math.random() * 15;
                    
                    return (
                      <motion.div
                        key={`star-${i}`}
                        className="absolute text-yellow-400"
                        style={{ fontSize: 10 + Math.random() * 6 }}
                        initial={{ 
                          x: 0, 
                          y: 0, 
                          scale: 0,
                          opacity: 1
                        }}
                        animate={{ 
                          x: Math.cos(angle * Math.PI / 180) * distance,
                          y: Math.sin(angle * Math.PI / 180) * distance - 15,
                          scale: [0, 1.5, 0],
                          opacity: [1, 1, 0]
                        }}
                        transition={{ 
                          duration: 0.6 + Math.random() * 0.3,
                          ease: "easeOut",
                          delay: Math.random() * 0.1
                        }}
                      >
                        ✦
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Traveling indicator dot */}
            <AnimatePresence>
              {tooltip && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute z-40 pointer-events-none"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {/* Outer glow ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20"
                    style={{ width: 24, height: 24, marginLeft: -12, marginTop: -12 }}
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.4, 0, 0.4]
                    }}
                    transition={{ 
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  {/* Main dot */}
                  <div 
                    className="w-3 h-3 rounded-full bg-primary border-2 border-background shadow-lg"
                    style={{ 
                      boxShadow: '0 0 8px hsl(var(--primary)), 0 0 16px hsl(var(--primary) / 0.5)' 
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Interactive Tooltip */}
            <AnimatePresence>
              {tooltip && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-50 pointer-events-auto"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                    transform: 'translate(-50%, -120%)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                >
                  <div className={cn(
                    "bg-popover border rounded-lg shadow-xl px-3 py-2.5 text-sm transition-colors",
                    tooltip.isLocked 
                      ? "border-muted-foreground/30 cursor-not-allowed opacity-80" 
                      : "border-border cursor-pointer hover:border-primary/50"
                  )}>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      {tooltip.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      {tooltip.courseName}
                      {!tooltip.isLocked && <ChevronRight className="h-3 w-3 text-primary" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                      <span className="font-medium">{tooltip.hours}h</span>
                      <span>•</span>
                      <span className={cn("font-medium", tooltip.isLocked ? "text-muted-foreground" : "text-primary")}>{tooltip.readiness}%</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                      {tooltip.isLocked ? '🔒 Locked' : tooltip.phase === 'learning' ? '📚 Learning' : '✓ Validation'}
                    </div>
                    
                    {/* Status Info */}
                    <div className="mt-2 pt-2 border-t border-border/50">
                      {tooltip.isLocked ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" />
                          <span className="text-xs">Complete previous course to unlock</span>
                        </div>
                      ) : tooltip.isCompleted ? (
                        <div className="flex items-center gap-1.5 text-green-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Course Completed</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 text-primary">
                            <Play className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">
                              Next: Lesson {tooltip.nextLessonNumber}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {tooltip.completedLessons}/{tooltip.lessonCount}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Progress bar */}
                    {!tooltip.isLocked && (
                      <div className="mt-1.5">
                        <Progress value={tooltip.progress} className="h-1" />
                      </div>
                    )}
                    
                    <div className={cn(
                      "text-[10px] mt-2 font-medium flex items-center gap-1",
                      tooltip.isLocked ? "text-muted-foreground" : "text-primary"
                    )}>
                      {tooltip.isLocked ? (
                        <span>🔒 Locked</span>
                      ) : tooltip.isCompleted ? (
                        <span>Click to view</span>
                      ) : (
                        <>
                          <span>Click to continue</span>
                          <ChevronRight className="h-3 w-3" />
                        </>
                      )}
                    </div>
                    
                    {/* Arrow */}
                    <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-border" />
                    <div className="absolute left-1/2 bottom-0.5 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-popover" />
                  </div>
                  {/* Vertical line to point */}
                  <div 
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 top-full w-px",
                      tooltip.isLocked ? "bg-muted-foreground/30" : "bg-primary/50"
                    )}
                    style={{ height: '8px' }}
                  />
                  {/* Dot on line */}
                  <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-background shadow-md",
                    tooltip.isLocked ? "bg-muted-foreground" : "bg-primary"
                  )} style={{ top: 'calc(100% + 8px)', transform: 'translate(-50%, -50%)' }} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Origin point - Start marker with MapPin */}
            <div 
              className="absolute z-30"
              style={{ left: 0, bottom: 0, transform: 'translate(-12px, 12px)' }}
            >
              <div className="flex flex-col items-center gap-1">
                <motion.div 
                  className="relative"
                  initial={{ scale: 0, y: -10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                >
                  {/* Location pin shape */}
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-background">
                    <MapPin className="h-4 w-4 text-primary-foreground" />
                  </div>
                  {/* Pin pointer */}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
                </motion.div>
                <span className="text-xs text-primary font-semibold uppercase tracking-wide mt-2">
                  Start
                </span>
              </div>
            </div>


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

            {/* Course starting position markers (location pins with lock) */}
            {pathData.courses.map((course, index) => {
              // Skip first course (start point already exists at origin)
              if (index === 0) return null;
              
              const x = (course.startHours / totalLearningHours) * 100;
              const y = 100 - course.startReadiness;
              
              return (
                <motion.div
                  key={`start-marker-${course.id}`}
                  className="absolute z-25 group"
                  style={{ 
                    left: `${x}%`, 
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  initial={{ scale: 0, opacity: 0, y: -10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.15, type: "spring", stiffness: 200 }}
                >
                  {/* Location pin shape */}
                  <div className="relative">
                    {/* Pin body */}
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 transition-all",
                      course.isLocked 
                        ? "bg-muted border-muted-foreground/30" 
                        : course.isCompleted 
                          ? "bg-green-500/20 border-green-500/50"
                          : course.isActive
                            ? "bg-primary/20 border-primary/50"
                            : "bg-background border-border"
                    )}>
                      <Lock className={cn(
                        "h-3 w-3 transition-colors",
                        course.isLocked 
                          ? "text-muted-foreground" 
                          : course.isCompleted
                            ? "text-green-500"
                            : course.isActive
                              ? "text-primary"
                              : "text-muted-foreground/50"
                      )} />
                    </div>
                    {/* Pin pointer */}
                    <div className={cn(
                      "absolute left-1/2 -translate-x-1/2 -bottom-1 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent transition-colors",
                      course.isLocked 
                        ? "border-t-muted-foreground/30" 
                        : course.isCompleted
                          ? "border-t-green-500/50"
                          : course.isActive
                            ? "border-t-primary/50"
                            : "border-t-border"
                    )} />
                  </div>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 px-2 py-1 rounded bg-popover border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs z-50">
                    <div className="font-medium text-foreground">{course.name}</div>
                    <div className={cn(
                      "text-[10px] mt-0.5",
                      course.isLocked ? "text-muted-foreground" : "text-primary"
                    )}>
                      {course.isLocked ? (
                        <span className="flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> Locked
                        </span>
                      ) : course.isCompleted ? (
                        <span className="text-green-500">✓ Completed</span>
                      ) : course.isActive ? (
                        <span>In Progress</span>
                      ) : (
                        <span>Available</span>
                      )}
                    </div>
                    {/* Tooltip arrow */}
                    <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-border" />
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
          {pathData.courses.map((course, index) => {
            const courseItem = (
              <motion.div
                key={course.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.05 * index }}
                onClick={() => handleCourseClick(course, index)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  course.isActive && "bg-primary/5 border-primary/30 ring-1 ring-primary/20 cursor-pointer",
                  course.isCompleted && "bg-green-500/5 border-green-500/30 cursor-pointer",
                  course.isLocked && "bg-muted/30 border-border/50 opacity-60 cursor-not-allowed",
                  !course.isCompleted && !course.isActive && !course.isLocked && "bg-card border-border hover:border-primary/30 cursor-pointer"
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
            );

            // Wrap locked courses in HoverCard with mini-map
            if (course.isLocked) {
              return (
                <HoverCard key={course.id} openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    {courseItem}
                  </HoverCardTrigger>
                  <HoverCardContent 
                    side="left" 
                    align="center"
                    className="w-80 p-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">Journey Overview</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Complete previous courses to unlock <span className="font-medium text-foreground">{course.name}</span>
                      </p>
                      
                      {/* Mini-map SVG */}
                      <div className="relative bg-muted/30 rounded-lg p-3">
                        <svg 
                          viewBox="0 0 100 60" 
                          className="w-full h-20"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <defs>
                            <linearGradient id="miniProgressGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="hsl(var(--primary))" />
                              <stop offset="100%" stopColor="hsl(142 76% 46%)" />
                            </linearGradient>
                          </defs>
                          
                          {/* Full path (muted) */}
                          <path
                            d={pathData.completePath}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted-foreground/20"
                            vectorEffect="non-scaling-stroke"
                            transform="scale(1, 0.6) translate(0, 0)"
                          />
                          
                          {/* Progress path */}
                          <path
                            d={pathData.progressPath}
                            fill="none"
                            stroke="url(#miniProgressGradient)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            transform="scale(1, 0.6) translate(0, 0)"
                          />
                          
                          {/* Current position dot */}
                          {pathData.currentX > 0 && (
                            <circle
                              cx={pathData.currentX}
                              cy={pathData.currentY * 0.6}
                              r="3"
                              fill="hsl(var(--primary))"
                              stroke="hsl(var(--background))"
                              strokeWidth="1.5"
                            />
                          )}
                          
                          {/* Highlighted locked course position */}
                          <circle
                            cx={(course.startHours / totalLearningHours) * 100}
                            cy={(100 - course.startReadiness) * 0.6}
                            r="4"
                            fill="hsl(var(--muted-foreground))"
                            stroke="hsl(var(--background))"
                            strokeWidth="1.5"
                            className="animate-pulse"
                          />
                          
                          {/* Label for locked course */}
                          <text
                            x={(course.startHours / totalLearningHours) * 100}
                            y={(100 - course.startReadiness) * 0.6 - 8}
                            textAnchor="middle"
                            className="fill-muted-foreground text-[6px] font-medium"
                          >
                            You are here →
                          </text>
                        </svg>
                        
                        {/* Mini legend */}
                        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                          <span>0h</span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span>Current</span>
                          </span>
                          <span>{totalLearningHours}h</span>
                        </div>
                      </div>
                      
                      {/* Prerequisites */}
                      <div className="text-xs">
                        <span className="text-muted-foreground">Prerequisites: </span>
                        {pathData.courses
                          .filter((c, i) => i < index && !c.isCompleted)
                          .slice(0, 2)
                          .map((c, i, arr) => (
                            <span key={c.id}>
                              <span className="font-medium text-foreground">{c.name}</span>
                              {i < arr.length - 1 && ", "}
                            </span>
                          ))}
                        {pathData.courses.filter((c, i) => i < index && !c.isCompleted).length > 2 && (
                          <span className="text-muted-foreground">
                            {" "}+{pathData.courses.filter((c, i) => i < index && !c.isCompleted).length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            }
            
            return courseItem;
          })}
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
