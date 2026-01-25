/**
 * NotesFocusMode - A true Notion-style writing workspace
 * 
 * Users should forget they're inside an LMS.
 * This is a personal thinking space, not a course feature.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Check, 
  StickyNote,
  ChevronRight,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { NotionStyleEditor } from './NotionStyleEditor';
import { getTextPreview } from '@/lib/tiptapMigration';
import { useCourseNotes } from '@/hooks/useCourseNotes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotesFocusModeProps {
  courseId: string | undefined;
  userId: string | undefined;
  courseName: string;
  onExit: () => void;
  onNavigateToLesson?: (lessonId: string) => void;
}

interface AvailableLesson {
  id: string;
  title: string;
}

export function NotesFocusMode({
  courseId,
  userId,
  courseName,
  onExit,
  onNavigateToLesson,
}: NotesFocusModeProps) {
  const {
    notes,
    selectedNote,
    editContent,
    isLoading,
    isSaving,
    selectNote,
    setEditContent,
    createNote,
  } = useCourseNotes({ courseId, userId });

  const [showSaving, setShowSaving] = useState(false);
  const [availableLessons, setAvailableLessons] = useState<AvailableLesson[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const savingTimeoutRef = useRef<NodeJS.Timeout>();
  const editorRef = useRef<any>(null);

  // Show "Saving…" only briefly during active writes
  useEffect(() => {
    if (isSaving) {
      setShowSaving(true);
      if (savingTimeoutRef.current) clearTimeout(savingTimeoutRef.current);
    } else {
      savingTimeoutRef.current = setTimeout(() => setShowSaving(false), 800);
    }
    return () => {
      if (savingTimeoutRef.current) clearTimeout(savingTimeoutRef.current);
    };
  }, [isSaving]);

  // Load available lessons when dropdown opens
  const loadAvailableLessons = async () => {
    if (!courseId) return;
    setIsLoadingLessons(true);
    
    try {
      // Get course lessons that don't have notes yet
      const { data: courseLessons } = await supabase
        .from("course_lessons")
        .select("id, title")
        .eq("course_id", courseId)
        .is("deleted_at", null)
        .order("lesson_rank", { ascending: true });

      const existingLessonIds = new Set(notes.map(n => n.lesson_id));
      const available = (courseLessons || []).filter(l => !existingLessonIds.has(l.id));
      setAvailableLessons(available);
    } catch (error) {
      console.error("Error loading lessons:", error);
    } finally {
      setIsLoadingLessons(false);
    }
  };

  // Handle new note creation
  const handleCreateNote = async (lesson: AvailableLesson) => {
    const newNote = await createNote(lesson.id, lesson.title);
    if (newNote) {
      // Focus editor after creation
      setTimeout(() => {
        editorRef.current?.focus?.();
      }, 100);
    } else {
      toast({
        title: "Couldn't create note",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Group notes by date
  const groupedNotes = useMemo(() => {
    const groups: { [key: string]: typeof notes } = {};
    
    notes.forEach((note) => {
      const date = new Date(note.updated_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else {
        groupKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(note);
    });
    
    return groups;
  }, [notes]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Escape to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  // Not authenticated
  if (!userId) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center max-w-xs">
          <StickyNote className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-base font-medium text-foreground mb-1.5">Sign in to view notes</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Your notes are private and saved automatically.
          </p>
          <Button variant="outline" size="sm" onClick={onExit}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-50 bg-white dark:bg-background"
    >
      {/* Top Bar — 44px, readable contrast */}
      <header className="h-11 flex items-center px-4 border-b border-border/30">
        {/* Back */}
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-[13px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Back to course</span>
        </button>
        
        {/* Title — Clear, readable */}
        <div className="flex-1 flex items-center gap-2 ml-4 min-w-0">
          <span className="text-[13px] font-medium text-foreground">Notes</span>
          <span className="text-muted-foreground/40 hidden md:inline">—</span>
          <span className="text-[13px] font-medium text-foreground/80 truncate hidden md:inline">{courseName}</span>
        </div>

        {/* Save status — Visible, reassuring */}
        <div className="flex-shrink-0">
          {selectedNote && (
            <AnimatePresence mode="wait">
              {showSaving ? (
                <motion.span
                  key="saving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[12px] text-muted-foreground"
                >
                  Saving…
                </motion.span>
              ) : (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[12px] text-primary/80 flex items-center gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </motion.span>
              )}
            </AnimatePresence>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-2.75rem)]">
        {/* Left Sidebar — 260px, soft tint */}
        <aside className="w-[260px] bg-[hsl(142_20%_97%)] dark:bg-muted/10 flex-shrink-0 hidden md:flex flex-col border-r border-border/20">
          {/* New Note — Functional dropdown */}
          <div className="px-3 pt-3 pb-2">
            <DropdownMenu onOpenChange={(open) => open && loadAvailableLessons()}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-[13px] text-foreground/70 hover:text-foreground transition-colors group">
                  <Plus className="h-3.5 w-3.5" />
                  <span>New note</span>
                  <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {isLoadingLessons ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading lessons…</div>
                ) : availableLessons.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    All lessons have notes
                  </div>
                ) : (
                  availableLessons.map((lesson) => (
                    <DropdownMenuItem
                      key={lesson.id}
                      onClick={() => handleCreateNote(lesson)}
                      className="cursor-pointer"
                    >
                      <span className="truncate">{lesson.title}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <ScrollArea className="flex-1 px-2">
            {isLoading ? (
              <div className="py-12 text-center">
                <span className="text-xs text-muted-foreground">Loading…</span>
              </div>
            ) : notes.length === 0 ? (
              <div className="py-12 px-3 text-center">
                <p className="text-[13px] text-muted-foreground">No notes yet</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Click "+ New note" to start
                </p>
              </div>
            ) : (
              <div className="pb-4">
                {Object.entries(groupedNotes).map(([dateGroup, groupNotes]) => (
                  <div key={dateGroup} className="mt-4 first:mt-0">
                    {/* Section Label — Readable */}
                    <div className="px-2 mb-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                        {dateGroup}
                      </span>
                    </div>
                    
                    {/* Notes */}
                    <div className="space-y-0.5">
                      {groupNotes.map((note) => {
                        const isSelected = selectedNote?.id === note.id;
                        const preview = getTextPreview(note.content, 45) || "Empty note";

                        return (
                          <button
                            key={note.id}
                            onClick={() => selectNote(note)}
                            className={cn(
                              "w-full text-left px-2.5 py-2 rounded-md transition-all relative",
                              isSelected
                                ? "bg-primary/12"
                                : "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                            )}
                          >
                            {/* Left accent bar for selected state */}
                            {isSelected && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-primary rounded-full" />
                            )}
                            <div className={cn(
                              "text-[13px] font-medium truncate transition-colors pl-1",
                              isSelected ? "text-foreground" : "text-foreground/80"
                            )}>
                              {note.lesson_title}
                            </div>
                            <p className={cn(
                              "text-[11px] line-clamp-1 mt-0.5 pl-1",
                              isSelected ? "text-muted-foreground/70" : "text-muted-foreground/60"
                            )}>
                              {preview}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Writing Canvas — The heart of the experience */}
        <main className="flex-1 overflow-auto bg-white dark:bg-background">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          ) : notes.length === 0 ? (
            <EmptyState onNewNote={() => loadAvailableLessons()} />
          ) : selectedNote ? (
            <div className="max-w-[740px] mx-auto px-6 md:px-10 pt-14 pb-32">
              {/* Metadata Strip — Readable secondary text */}
              <div className="mb-10 flex items-center gap-3 text-[12px]">
                <span className="text-foreground/70 bg-muted/50 px-2.5 py-1 rounded-md font-medium">
                  {selectedNote.lesson_title}
                </span>
                {onNavigateToLesson && (
                  <button
                    onClick={() => onNavigateToLesson(selectedNote.lesson_id)}
                    className="text-primary hover:text-primary/80 hover:underline transition-colors flex items-center gap-0.5 font-medium"
                  >
                    Go to lesson
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                <span className="text-muted-foreground ml-auto">
                  {formatTime(selectedNote.updated_at)}
                </span>
              </div>

              {/* Editor */}
              <NotionStyleEditor
                ref={editorRef}
                value={editContent}
                onChange={setEditContent}
                placeholder="Start writing your notes…"
                autoFocus
                className="min-h-[50vh]"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Select a note from the sidebar</p>
            </div>
          )}
        </main>
      </div>
    </motion.div>
  );
}

// Empty State — Clear invitation
function EmptyState({ onNewNote }: { onNewNote?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <StickyNote className="h-7 w-7 text-primary/60" />
      </div>
      <h2 className="text-xl font-medium text-foreground mb-2">
        Your course notes
      </h2>
      <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed mb-6">
        Notes are private and saved automatically. Create your first note to get started.
      </p>
      {/* Soft blinking cursor */}
      <div className="h-6 flex items-center">
        <div className="w-0.5 h-5 bg-primary/60 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

export default NotesFocusMode;
