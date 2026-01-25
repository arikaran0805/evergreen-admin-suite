/**
 * NotesFocusMode - Full-screen Notion-like notes experience
 * 
 * Replaces the course layout when Notes tab is active.
 * Features:
 * - Minimal header with back button
 * - Full-width centered editor
 * - Autosave status indicator
 * - Empty state for first-time notes
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Check, 
  Loader2, 
  StickyNote,
  FileText,
  ChevronRight,
  Calendar,
  Clock,
} from 'lucide-react';
import { NotionStyleEditor } from './NotionStyleEditor';
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
    deleteNote,
    refreshNotes,
  } = useCourseNotes({ courseId, userId });

  // Track if user has started writing in the empty state
  const [isWritingNew, setIsWritingNew] = useState(false);

  // Group notes by date for sidebar
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
        groupKey = date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
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

  // Handle escape key to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  // Empty state component
  const EmptyState = () => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full text-center px-4"
    >
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-6">
        <StickyNote className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        Start writing your course notes
      </h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Your notes are private and saved automatically. Take notes while learning to help remember key concepts.
      </p>
      <div className="relative">
        <div className="w-2 h-5 bg-primary/60 animate-pulse rounded-sm" />
      </div>
      <p className="text-xs text-muted-foreground/60 mt-6">
        Notes are created per lesson. Go to a lesson to start taking notes.
      </p>
    </motion.div>
  );

  // Not authenticated state
  if (!userId) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center">
          <StickyNote className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Sign in to view your notes</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create notes while learning and access them here anytime.
          </p>
          <Button onClick={onExit}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-[hsl(142_20%_98%)] dark:bg-background"
    >
      {/* Minimal Header */}
      <header className="h-14 border-b border-border/40 bg-background/80 backdrop-blur-sm flex items-center px-4 gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to course</span>
        </Button>
        
        <div className="h-5 w-px bg-border" />
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <StickyNote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate">Notes</span>
          <span className="text-muted-foreground text-sm hidden md:inline">—</span>
          <span className="text-muted-foreground text-sm truncate hidden md:inline">{courseName}</span>
        </div>

        {/* Autosave status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <AnimatePresence mode="wait">
            {isSaving ? (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </motion.div>
            ) : selectedNote && editContent === selectedNote.content ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Check className="h-3 w-3 text-primary" />
                <span>Saved</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Notes Sidebar - Only show if there are notes */}
        {notes.length > 0 && (
          <aside className="w-64 border-r border-border/40 bg-background/50 flex-shrink-0 hidden md:block">
            <div className="p-4 border-b border-border/40">
              <h3 className="text-sm font-medium text-muted-foreground">
                {notes.length} note{notes.length !== 1 ? 's' : ''}
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-57px)]">
              <div className="p-2">
                {Object.entries(groupedNotes).map(([dateGroup, groupNotes]) => (
                  <div key={dateGroup} className="mb-4">
                    <div className="flex items-center gap-2 px-2 mb-2">
                      <Calendar className="h-3 w-3 text-muted-foreground/60" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {dateGroup}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {groupNotes.map((note) => {
                        const isSelected = selectedNote?.id === note.id;
                        const preview = note.content.length > 40
                          ? note.content.substring(0, 40) + "..."
                          : note.content || "Empty note";

                        return (
                          <button
                            key={note.id}
                            onClick={() => selectNote(note)}
                            className={cn(
                              "w-full text-left p-2.5 rounded-lg transition-all",
                              isSelected
                                ? "bg-primary/10 text-foreground"
                                : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-0.5">
                              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-sm font-medium truncate">
                                {note.lesson_title}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 ml-5.5">
                              {preview}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </aside>
        )}

        {/* Editor Area */}
        <main className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <EmptyState />
          ) : selectedNote ? (
            <div className="max-w-3xl mx-auto px-6 py-8 md:py-12">
              {/* Note header */}
              <div className="mb-8">
                <Badge variant="secondary" className="mb-3 text-xs font-normal">
                  <FileText className="h-3 w-3 mr-1" />
                  {selectedNote.lesson_title}
                </Badge>
                {onNavigateToLesson && (
                  <button
                    onClick={() => onNavigateToLesson(selectedNote.lesson_id)}
                    className="ml-3 text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Go to lesson
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Last edited {formatTime(selectedNote.updated_at)}
                </p>
              </div>

              {/* Rich text editor */}
              <NotionStyleEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="Start writing your notes..."
                autoFocus
                className="min-h-[60vh]"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a note from the sidebar</p>
            </div>
          )}
        </main>
      </div>
    </motion.div>
  );
}

export default NotesFocusMode;
