/**
 * useCourseTabManager - Manages single Course Detail tab per course
 * 
 * Ensures only ONE Course Detail tab per course exists.
 * Uses BroadcastChannel for cross-tab communication and navigation.
 * 
 * CRITICAL: When "Go to Lesson" is clicked from Deep Notes,
 * the existing Course Detail tab MUST be found and navigated, not create a new tab.
 */

import { useCallback, useEffect, useRef } from 'react';

// Prefix for course tab window names
const COURSE_TAB_PREFIX = 'lovable-course-';

// Broadcast channel for course navigation
const COURSE_CONTEXT_CHANNEL = 'lovable-course-context';

export interface CourseNavigationMessage {
  type: 'NAVIGATE_TO_LESSON' | 'FOCUS' | 'PING' | 'PONG';
  courseId: string;
  courseSlug?: string;
  lessonId?: string;
  lessonSlug?: string;
  timestamp: number;
}

/**
 * Check if a Course Detail tab exists for this course via BroadcastChannel ping
 * Returns a promise that resolves to true if tab exists and responded
 */
function pingExistingCourseTab(channel: BroadcastChannel, courseId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 200); // 200ms timeout
    
    const handlePong = (event: MessageEvent<CourseNavigationMessage>) => {
      if (event.data.type === 'PONG' && event.data.courseId === courseId) {
        clearTimeout(timeout);
        channel.removeEventListener('message', handlePong);
        resolve(true);
      }
    };
    
    channel.addEventListener('message', handlePong);
    channel.postMessage({
      type: 'PING',
      courseId,
      timestamp: Date.now(),
    });
  });
}

/**
 * Hook for navigating to a lesson from external contexts (Notes tab, etc.)
 * 
 * This is used by components that need to navigate TO a course lesson
 * from outside the Course Detail page.
 * 
 * BEHAVIOR:
 * 1. First, ping BroadcastChannel to find existing Course Detail tab
 * 2. If found, send NAVIGATE_TO_LESSON message (tab will focus + navigate)
 * 3. If not found, open new Course Detail tab with lesson
 */
export function useCourseNavigator() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isNavigatingRef = useRef(false);

  // Initialize broadcast channel
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    
    channelRef.current = new BroadcastChannel(COURSE_CONTEXT_CHANNEL);
    
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, []);

  /**
   * Navigate to a lesson in Course Detail
   * Reuses existing tab if available, otherwise opens new
   */
  const navigateToLesson = useCallback(async (options: {
    courseId: string;
    courseSlug: string;
    lessonId?: string;
    lessonSlug?: string;
  }) => {
    const { courseId, courseSlug, lessonId, lessonSlug } = options;
    
    if (isNavigatingRef.current) return false;
    isNavigatingRef.current = true;
    
    try {
      const tabId = `${COURSE_TAB_PREFIX}${courseId}`;
      const lessonParam = lessonSlug ? `?lesson=${lessonSlug}&tab=lessons` : '';
      const courseUrl = `/course/${courseSlug}${lessonParam}`;

      // Strategy 1: Ping existing tab via BroadcastChannel
      if (channelRef.current) {
        const tabExists = await pingExistingCourseTab(channelRef.current, courseId);
        
        if (tabExists) {
          // Tab exists - send navigation message
          // The existing tab will handle navigation and focus itself
          channelRef.current.postMessage({
            type: 'NAVIGATE_TO_LESSON',
            courseId,
            courseSlug,
            lessonId,
            lessonSlug,
            timestamp: Date.now(),
          } as CourseNavigationMessage);
          
          console.log('[CourseNavigator] Found existing tab, sent navigation message');
          return true;
        }
      }

      // Strategy 2: No existing tab found - open new one with named window
      console.log('[CourseNavigator] No existing tab, opening new:', courseUrl);
      window.open(courseUrl, tabId);
      
      return true;
    } finally {
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 300);
    }
  }, []);

  /**
   * Focus the Course Detail tab for a given course
   */
  const focusCourseTab = useCallback(async (courseId: string) => {
    if (!channelRef.current) return false;
    
    const tabExists = await pingExistingCourseTab(channelRef.current, courseId);
    
    if (tabExists) {
      channelRef.current.postMessage({
        type: 'FOCUS',
        courseId,
        timestamp: Date.now(),
      } as CourseNavigationMessage);
      return true;
    }
    
    return false;
  }, []);

  return { navigateToLesson, focusCourseTab };
}

/**
 * Hook for registering a Course Detail tab (used by CourseDetail page)
 * 
 * This sets the window.name and listens for navigation messages
 * from other tabs (like Deep Notes).
 */
export function useCourseTabRegistration(
  courseId: string | undefined,
  courseSlug: string | undefined,
  onNavigateToLesson?: (lessonSlug: string) => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!courseId) return;

    // Set window name for tab identification
    const tabId = `${COURSE_TAB_PREFIX}${courseId}`;
    window.name = tabId;

    console.log('[CourseTab] Registered tab:', tabId);

    // Set up broadcast channel listener
    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel(COURSE_CONTEXT_CHANNEL);
      
      const handleMessage = (event: MessageEvent<CourseNavigationMessage>) => {
        const message = event.data;
        
        // Only handle messages for this course
        if (message.courseId !== courseId) return;
        
        console.log('[CourseTab] Received message:', message.type);
        
        // Handle PING - respond with PONG and focus self
        if (message.type === 'PING') {
          channelRef.current?.postMessage({
            type: 'PONG',
            courseId,
            timestamp: Date.now(),
          } as CourseNavigationMessage);
          window.focus();
          return;
        }
        
        // Handle FOCUS - just focus the window
        if (message.type === 'FOCUS') {
          window.focus();
          return;
        }
        
        // Handle NAVIGATE_TO_LESSON
        if (message.type === 'NAVIGATE_TO_LESSON' && message.lessonSlug) {
          console.log('[CourseTab] Navigating to lesson:', message.lessonSlug);
          window.focus();
          onNavigateToLesson?.(message.lessonSlug);
        }
      };
      
      channelRef.current.addEventListener('message', handleMessage);
    }

    // Cleanup on unmount
    return () => {
      console.log('[CourseTab] Unregistered tab:', tabId);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [courseId, onNavigateToLesson]);

  return { channelRef };
}
