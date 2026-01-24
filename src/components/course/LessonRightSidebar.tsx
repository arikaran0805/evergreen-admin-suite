import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLessonNotes } from "@/hooks/useLessonNotes";
import {
  MessageCircle,
  Workflow,
  Target,
  Lightbulb,
  Lock,
  StickyNote,
  Play,
  FileText,
  HelpCircle,
  User,
  ChevronRight,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";

interface LessonRightSidebarProps {
  lessonId: string | undefined;
  lessonTitle: string;
  courseId: string | undefined;
  courseSlug: string;
  userId: string | undefined;
  nextLesson: {
    title: string;
    slug: string;
  } | null;
  isLessonCompleted: boolean;
  isHeaderVisible: boolean;
  showAnnouncement: boolean;
  assignedModerator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
}

// Lesson Flow sections - semantic flow of the lesson
const LESSON_FLOW_SECTIONS = [
  { id: "chat-bubbles", label: "Chat Bubbles", icon: MessageCircle, selector: "[data-chat-bubble], .chat-bubble-container" },
  { id: "cause-effect", label: "Cause & Effect", icon: Workflow, selector: "[data-cause-effect], .explanation-block, .rich-text-explanation" },
  { id: "practice-points", label: "Practice Points", icon: Target, selector: "[data-practice], .practice-prompt, .exercise-block" },
  { id: "key-takeaway", label: "Key Takeaway", icon: Lightbulb, locked: true, selector: "[data-takeaway], .takeaway-block" },
];

// Practice items
const PRACTICE_ITEMS = [
  {
    id: "quick-questions",
    title: "Try 2 quick questions",
    description: "Test your understanding",
    icon: Sparkles,
  },
  {
    id: "run-code",
    title: "Run this code yourself",
    description: "Practice in the playground",
    icon: Play,
  },
  {
    id: "cheat-sheet",
    title: "Cheat sheet",
    description: "Quick reference guide",
    icon: FileText,
  },
];

export function LessonRightSidebar({
  lessonId,
  lessonTitle,
  courseId,
  courseSlug,
  userId,
  nextLesson,
  isLessonCompleted,
  isHeaderVisible,
  showAnnouncement,
  assignedModerator,
}: LessonRightSidebarProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  // Notes hook
  const { content, updateContent, isSaving, lastSaved, isLoading } = useLessonNotes({
    lessonId,
    courseId,
    userId,
  });

  // Format last saved time
  const lastSavedText = useMemo(() => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    if (diff < 60) return "Saved just now";
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    return `Saved ${Math.floor(diff / 3600)}h ago`;
  }, [lastSaved]);

  // Scroll spy for active section based on lesson flow
  useEffect(() => {
    const handleScroll = () => {
      const sections = LESSON_FLOW_SECTIONS.filter(s => !s.locked);
      for (const section of sections) {
        const element = document.querySelector(section.selector);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 200) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const section = LESSON_FLOW_SECTIONS.find(s => s.id === sectionId);
    if (section) {
      const element = document.querySelector(section.selector);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Calculate sticky top position based on header visibility (matching left sidebar)
  const stickyTopClass = isHeaderVisible
    ? (showAnnouncement ? 'top-[8.75rem]' : 'top-[6.5rem]')
    : (showAnnouncement ? 'top-[4.75rem]' : 'top-10');

  return (
    <aside className="hidden xl:block w-[300px] flex-shrink-0">
      <div className={cn("sticky transition-[top] duration-200 ease-out h-[calc(100vh-6.5rem)]", stickyTopClass)}>
        <div className="space-y-4 p-1 overflow-y-auto h-full">
        {/* SECTION 1: Lesson Flow (Semantic Navigation) */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              Lesson Flow
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <nav className="space-y-1">
              {LESSON_FLOW_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isLocked = section.locked && !isLessonCompleted;

                return (
                  <button
                    key={section.id}
                    onClick={() => !isLocked && scrollToSection(section.id)}
                    disabled={isLocked}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left relative",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : isLocked
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      isActive && "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-4 before:bg-primary before:rounded-full"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="flex-1 truncate">{section.label}</span>
                    {isLocked && <Lock className="h-3 w-3 text-muted-foreground/50" />}
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* SECTION 2: Notes (Premium Feature) */}
        {userId && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  Your Notes
                </CardTitle>
                {isSaving ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </span>
                ) : lastSavedText ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {lastSavedText}
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {isLoading ? (
                <div className="h-20 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Textarea
                  value={content}
                  onChange={(e) => updateContent(e.target.value)}
                  placeholder="Write your thoughts, shortcuts, or reminders…"
                  className={cn(
                    "resize-none border-border/50 bg-background/50 text-sm transition-all",
                    isNotesExpanded ? "min-h-[120px]" : "min-h-[60px]"
                  )}
                  onFocus={() => setIsNotesExpanded(true)}
                  onBlur={() => !content && setIsNotesExpanded(false)}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* SECTION 3: Practice & Reinforcement */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <Play className="h-4 w-4 text-muted-foreground" />
              Practice & Reinforce
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            {PRACTICE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className="w-full flex items-start gap-3 p-2 rounded-md text-left transition-all hover:bg-muted/50 hover:shadow-sm group"
                >
                  <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* SECTION 4: Ask / Confusion Box */}
        {userId && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                Need help?
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-sm text-muted-foreground mb-3">
                Stuck here? Ask a question about this lesson.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-sm border-border/50 hover:bg-muted/50"
              >
                <HelpCircle className="h-3.5 w-3.5 mr-2" />
                Ask a Question
              </Button>
            </CardContent>
          </Card>
        )}

        {/* SECTION 5: Instructor / Moderator Presence */}
        {assignedModerator && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Instructor Support
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border/50">
                  <AvatarImage src={assignedModerator.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {assignedModerator.full_name?.charAt(0)?.toUpperCase() || "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {assignedModerator.full_name || "Instructor"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0 h-5 bg-muted/50"
                    >
                      {assignedModerator.role === "senior_moderator"
                        ? "Senior Moderator"
                        : "Moderator"}
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Usually replies in 2–4 hrs
              </p>
            </CardContent>
          </Card>
        )}

        {/* SECTION 6: What's Next */}
        {nextLesson && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                Up Next
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {isLessonCompleted ? (
                <Link
                  to={`/courses/${courseSlug}?lesson=${nextLesson.slug}`}
                  className="block p-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {nextLesson.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Continue learning →
                  </p>
                </Link>
              ) : (
                <div className="p-2 rounded-md bg-muted/30">
                  <p className="text-sm font-medium text-muted-foreground truncate blur-[2px] select-none">
                    {nextLesson.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Lock className="h-3 w-3 text-muted-foreground/70" />
                    <p className="text-xs text-muted-foreground/70">
                      Unlocks after completion
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </aside>
  );
}

export default LessonRightSidebar;
