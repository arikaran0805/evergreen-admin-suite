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
} from 'lucide-react';
import { NotionStyleEditor } from './NotionStyleEditor';
import { getTextPreview } from '@/lib/tiptapMigration';
import { useCourseNotes } from '@/hooks/useCourseNotes';

interface NotesFocusModeProps {
  courseId: string | undefined;
  userId: string | undefined;
  courseName: string;
  onExit: () => void;
  onNavigateToLesson?: (lessonId: string) => void;
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
  } = useCourseNotes({ courseId, userId });

  // Track if user is actively typing (for save indicator)
  const [showSaving, setShowSaving] = useState(false);
  const savingTimeoutRef = useRef<NodeJS.Timeout>();

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
          <StickyNote className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-base font-medium mb-1.5">Sign in to view notes</h3>
          <p className="text-sm text-muted-foreground/60 mb-5">
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
      {/* Top Bar — 44px, ultra-minimal */}
      <header className="h-11 flex items-center px-4 border-b border-border/20">
        {/* Back */}
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-muted-foreground/70 hover:text-foreground transition-colors text-[13px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Back to course</span>
        </button>
        
        {/* Title */}
        <div className="flex-1 flex items-center gap-2.5 ml-4 min-w-0">
          <span className="text-[13px] font-medium text-foreground/90">Notes</span>
          <span className="text-muted-foreground/30 hidden md:inline">—</span>
          <span className="text-[13px] text-muted-foreground/50 truncate hidden md:inline">{courseName}</span>
        </div>

        {/* Save status — muted, no animation noise */}
        <div className="flex-shrink-0 w-16 text-right">
          {selectedNote && (
            <span className={cn(
              "text-[11px] transition-opacity duration-200",
              showSaving ? "text-muted-foreground/50" : "text-muted-foreground/40"
            )}>
              {showSaving ? "Saving…" : (
                <span className="flex items-center justify-end gap-1">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
            </span>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-2.75rem)]">
        {/* Left Sidebar — 260px, soft tint */}
        <aside className="w-[260px] bg-[hsl(142_20%_97%)] dark:bg-muted/10 flex-shrink-0 hidden md:flex flex-col">
          {/* New Note */}
          <div className="px-3 pt-3 pb-2">
            <button
              className="text-[13px] text-muted-foreground/60 hover:text-foreground transition-colors"
              onClick={() => {/* Navigate to lesson to create note */}}
            >
              + New note
            </button>
          </div>
          
          <ScrollArea className="flex-1 px-2">
            {isLoading ? (
              <div className="py-12 text-center">
                <span className="text-xs text-muted-foreground/40">Loading…</span>
              </div>
            ) : notes.length === 0 ? (
              <div className="py-12 px-3 text-center">
                <p className="text-[13px] text-muted-foreground/50">No notes yet</p>
                <p className="text-[11px] text-muted-foreground/35 mt-1">
                  Go to a lesson to start
                </p>
              </div>
            ) : (
              <div className="pb-4">
                {Object.entries(groupedNotes).map(([dateGroup, groupNotes]) => (
                  <div key={dateGroup} className="mt-4 first:mt-0">
                    {/* Section Label */}
                    <div className="px-2 mb-1.5">
                      <span className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
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
                                ? "bg-primary/10"
                                : "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                            )}
                          >
                            {/* Left accent bar for selected state */}
                            {isSelected && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-primary rounded-full" />
                            )}
                            <div className={cn(
                              "text-[13px] font-medium truncate transition-colors",
                              isSelected ? "text-foreground" : "text-foreground/70"
                            )}>
                              {note.lesson_title}
                            </div>
                            <p className={cn(
                              "text-[11px] line-clamp-1 mt-0.5",
                              isSelected ? "text-muted-foreground/60" : "text-muted-foreground/45"
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
              <span className="text-xs text-muted-foreground/30">Loading…</span>
            </div>
          ) : notes.length === 0 ? (
            <EmptyState />
          ) : selectedNote ? (
            <div className="max-w-[740px] mx-auto px-6 md:px-10 pt-14 pb-32">
              {/* Metadata Strip — Soft, informational */}
              <div className="mb-10 flex items-center gap-3 text-[12px]">
                <span className="text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded">
                  {selectedNote.lesson_title}
                </span>
                {onNavigateToLesson && (
                  <button
                    onClick={() => onNavigateToLesson(selectedNote.lesson_id)}
                    className="text-primary/60 hover:text-primary/80 transition-colors flex items-center gap-0.5"
                  >
                    Go to lesson
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                <span className="text-muted-foreground/30 ml-auto">
                  {formatTime(selectedNote.updated_at)}
                </span>
              </div>

              {/* Editor */}
              <NotionStyleEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="Start writing your notes…"
                autoFocus
                className="min-h-[50vh]"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-[13px] text-muted-foreground/40">Select a note</p>
            </div>
          )}
        </main>
      </div>
    </motion.div>
  );
}

// Empty State — Calm invitation to write
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mb-5">
        <StickyNote className="h-6 w-6 text-muted-foreground/30" />
      </div>
      <h2 className="text-lg font-medium text-foreground/85 mb-1.5">
        Your course notes
      </h2>
      <p className="text-[13px] text-muted-foreground/50 max-w-[280px] leading-relaxed">
        Notes are private and saved automatically. Go to a lesson to start writing.
      </p>
      {/* Soft blinking cursor */}
      <div className="mt-8 h-5 flex items-center">
        <div className="w-0.5 h-4 bg-primary/40 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

export default NotesFocusMode;
