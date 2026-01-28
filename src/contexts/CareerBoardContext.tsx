/**
 * Career Board Context
 * 
 * Provides career data to all components within the Career Board shell.
 * Children inherit career context implicitly - no per-course checks needed.
 * 
 * ARCHITECTURE:
 * - CareerBoardLayout sets this context once
 * - All children (CareerCourseDetail, etc.) consume it
 * - No async header decision logic anywhere in children
 */
import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserState } from "@/hooks/useUserState";
import { useCareers } from "@/hooks/useCareers";

interface Career {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
}

interface CareerCourse {
  id: string;
  name: string;
  slug: string;
}

interface CareerBoardContextValue {
  /** The active career for this board */
  career: Career | null;
  /** All courses in this career path */
  careerCourses: CareerCourse[];
  /** Whether data is still loading */
  isLoading: boolean;
  /** Whether the context is fully initialized */
  isReady: boolean;
  /** Current course being viewed (if any) */
  currentCourseSlug: string | null;
  /** Set the current course slug (for CareerScopedHeader highlighting) */
  setCurrentCourseSlug: (slug: string | null) => void;
}

const CareerBoardContext = createContext<CareerBoardContextValue | null>(null);

export const useCareerBoard = (): CareerBoardContextValue => {
  const context = useContext(CareerBoardContext);
  if (!context) {
    throw new Error("useCareerBoard must be used within CareerBoardProvider");
  }
  return context;
};

/**
 * Optional hook that returns null if not in Career Board context
 * Useful for components that may or may not be in Career Board
 */
export const useCareerBoardOptional = (): CareerBoardContextValue | null => {
  return useContext(CareerBoardContext);
};

interface CareerBoardProviderProps {
  children: ReactNode;
}

export const CareerBoardProvider = ({ children }: CareerBoardProviderProps) => {
  const { careerId } = useParams<{ careerId: string }>();
  const navigate = useNavigate();
  const { isPro, isLoading: userStateLoading } = useUserState();
  const { getCareerBySlug, getCareerCourses, loading: careersLoading } = useCareers();
  
  const [currentCourseSlug, setCurrentCourseSlug] = useState<string | null>(null);
  const [career, setCareer] = useState<Career | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Resolve career from careerId param (which is the slug)
  useEffect(() => {
    if (careersLoading || !careerId) return;

    const resolved = getCareerBySlug(careerId);
    if (resolved) {
      setCareer({
        id: resolved.id,
        name: resolved.name,
        slug: resolved.slug,
        description: resolved.description ?? null,
        icon: resolved.icon,
        color: resolved.color,
      });
    } else {
      setCareer(null);
    }
    setIsReady(true);
  }, [careerId, careersLoading, getCareerBySlug]);

  // Redirect non-Pro users away from Career Board
  useEffect(() => {
    if (userStateLoading) return;
    
    if (!isPro) {
      // Redirect to courses page with a message
      navigate("/courses", { replace: true });
    }
  }, [isPro, userStateLoading, navigate]);

  // Get courses for this career
  const careerCourses = useMemo((): CareerCourse[] => {
    if (!career?.id) return [];
    
    const courses = getCareerCourses(career.id);
    return courses
      .filter(cc => cc.course)
      .map(cc => ({
        id: cc.course!.id,
        name: cc.course!.name,
        slug: cc.course!.slug,
      }));
  }, [career?.id, getCareerCourses]);

  const isLoading = userStateLoading || careersLoading || !isReady;

  const value: CareerBoardContextValue = {
    career,
    careerCourses,
    isLoading,
    isReady,
    currentCourseSlug,
    setCurrentCourseSlug,
  };

  return (
    <CareerBoardContext.Provider value={value}>
      {children}
    </CareerBoardContext.Provider>
  );
};

export default CareerBoardContext;
