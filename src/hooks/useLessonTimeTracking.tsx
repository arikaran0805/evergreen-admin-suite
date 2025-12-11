import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseLessonTimeTrackingProps {
  lessonId: string | undefined;
  courseId: string | undefined;
}

export const useLessonTimeTracking = ({ lessonId, courseId }: UseLessonTimeTrackingProps) => {
  const startTimeRef = useRef<number>(Date.now());
  const lastSaveRef = useRef<number>(Date.now());
  const accumulatedTimeRef = useRef<number>(0);

  const saveTime = useCallback(async () => {
    if (!lessonId || !courseId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastSaveRef.current) / 1000);
    
    if (elapsedSeconds < 5) return; // Don't save if less than 5 seconds

    accumulatedTimeRef.current += elapsedSeconds;
    lastSaveRef.current = now;

    const today = new Date().toISOString().split('T')[0];

    // Upsert the time tracking record
    const { error } = await supabase
      .from('lesson_time_tracking')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        course_id: courseId,
        duration_seconds: accumulatedTimeRef.current,
        tracked_date: today,
      }, {
        onConflict: 'user_id,lesson_id,tracked_date',
      });

    if (error) {
      console.error('Error saving time tracking:', error);
    }
  }, [lessonId, courseId]);

  useEffect(() => {
    if (!lessonId || !courseId) return;

    // Reset tracking when lesson changes
    startTimeRef.current = Date.now();
    lastSaveRef.current = Date.now();
    accumulatedTimeRef.current = 0;

    // Load existing time for today
    const loadExistingTime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('lesson_time_tracking')
        .select('duration_seconds')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .eq('tracked_date', today)
        .maybeSingle();

      if (data) {
        accumulatedTimeRef.current = data.duration_seconds;
      }
    };

    loadExistingTime();

    // Save time every 30 seconds
    const interval = setInterval(saveTime, 30000);

    // Save on visibility change (when user switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveTime();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Save on beforeunload
    const handleBeforeUnload = () => {
      saveTime();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveTime(); // Save on unmount
    };
  }, [lessonId, courseId, saveTime]);

  return { saveTime };
};
