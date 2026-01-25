/**
 * NotesFocusMode - Full-screen Notion-like notes experience
 * 
 * A true writing workspace that makes users forget they're in an LMS.
 * Designed to feel indistinguishable from Notion.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Check, 
  Loader2, 
  StickyNote,
  ChevronRight,
  Plus,
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
    refreshNotes,
  } = useCourseNotes({ courseId, userId });

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
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 bg-background"
    >
      {/* Ultra-Minimal Top Bar - 48px height */}
      <header className="h-12 border-b border-border/30 bg-background flex items-center px-4 gap-3">
        {/* Left: Back button */}
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to course</span>
        </button>
        
        {/* Center-left: Title */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-border/60">|</span>
          <span className="text-sm font-medium text-foreground truncate">
            Notes
          </span>
          <span className="text-muted-foreground/50 text-sm hidden md:inline">—</span>
          <span className="text-muted-foreground/70 text-sm truncate hidden md:inline">{courseName}</span>
        </div>

        {/* Right: Autosave status */}
        <div className="flex-shrink-0">
          <AnimatePresence mode="wait">
            {isSaving ? (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/70"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving…</span>
              </motion.div>
            ) : selectedNote ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/60"
              >
                <Check className="h-3 w-3 text-primary/70" />
                <span>Saved</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-3rem)]">
        {/* Left Sidebar - Notes List */}
        <aside className="w-[268px] border-r border-border/30 bg-muted/20 flex-shrink-0 hidden md:flex flex-col">
          {/* New Note Button */}
          <div className="p-3 border-b border-border/20">
            <button
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full px-2 py-1.5 rounded-md hover:bg-muted/50"
              onClick={() => {
                // TODO: Navigate to a lesson to create a new note
              }}
            >
              <Plus className="h-4 w-4" />
              <span>New note</span>
            </button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-muted-foreground/60">
                    No notes yet
                  </p>
                  <p className="text-xs text-muted-foreground/40 mt-1">
                    Go to a lesson to start taking notes
                  </p>
                </div>
              ) : (
                Object.entries(groupedNotes).map(([dateGroup, groupNotes]) => (
                  <div key={dateGroup} className="mb-4">
                    {/* Date Group Label */}
                    <div className="px-2 mb-1.5">
                      <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                        {dateGroup}
                      </span>
                    </div>
                    
                    {/* Notes in Group */}
                    <div className="space-y-0.5">
                      {groupNotes.map((note) => {
                        const isSelected = selectedNote?.id === note.id;
                        const preview = getTextPreview(note.content, 50) || "Empty note";

                        return (
                          <button
                            key={note.id}
                            onClick={() => selectNote(note)}
                            className={cn(
                              "w-full text-left px-2.5 py-2 rounded-lg transition-all group",
                              isSelected
                                ? "bg-primary/10"
                                : "hover:bg-muted/60"
                            )}
                          >
                            <div className={cn(
                              "text-sm font-medium truncate transition-colors",
                              isSelected ? "text-foreground" : "text-foreground/80"
                            )}>
                              {note.lesson_title}
                            </div>
                            <p className="text-xs text-muted-foreground/60 line-clamp-1 mt-0.5">
                              {preview}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Editor Canvas - Main Area */}
        <main className="flex-1 overflow-auto bg-background">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          ) : notes.length === 0 ? (
            <EmptyState />
          ) : selectedNote ? (
            <div className="max-w-[780px] mx-auto px-6 md:px-12 pt-12 pb-24">
              {/* Metadata Strip - Minimal context */}
              <div className="mb-8 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground/70 bg-muted/40 px-2.5 py-1 rounded-md">
                  {selectedNote.lesson_title}
                </span>
                {onNavigateToLesson && (
                  <button
                    onClick={() => onNavigateToLesson(selectedNote.lesson_id)}
                    className="text-xs text-primary/70 hover:text-primary transition-colors flex items-center gap-0.5"
                  >
                    Go to lesson
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                <span className="text-xs text-muted-foreground/40 ml-auto">
                  Edited {formatTime(selectedNote.updated_at)}
                </span>
              </div>

              {/* Rich text editor - The heart of the experience */}
              <NotionStyleEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="Start writing your notes…"
                autoFocus
                className="min-h-[60vh]"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground/50">Select a note from the sidebar</p>
            </div>
          )}
        </main>
      </div>
    </motion.div>
  );
}

// Empty state component - Invites writing
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center mb-5">
        <StickyNote className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <h2 className="text-xl font-medium text-foreground/90 mb-2">
        Start writing your course notes
      </h2>
      <p className="text-sm text-muted-foreground/60 max-w-sm mb-6">
        Your notes are private and saved automatically. Go to a lesson to begin.
      </p>
      {/* Blinking cursor to invite writing */}
      <div className="h-6 flex items-center">
        <div className="w-0.5 h-5 bg-primary/50 animate-pulse rounded-full" />
      </div>
    </div>
  );
}

export default NotesFocusMode;
