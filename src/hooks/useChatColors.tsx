import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatColorSettings {
  mentor: {
    bubbleBg: string;
    bubbleText: string;
    avatarGradientFrom: string;
    avatarGradientTo: string;
  };
  course: {
    bubbleBg: string;
    bubbleText: string;
    avatarGradientFrom: string;
    avatarGradientTo: string;
  };
}

const DEFAULT_COLORS: ChatColorSettings = {
  mentor: {
    bubbleBg: "#d4f5e6",
    bubbleText: "#064e3b",
    avatarGradientFrom: "#34d399",
    avatarGradientTo: "#059669",
  },
  course: {
    bubbleBg: "#f1f5f9",
    bubbleText: "#0f172a",
    avatarGradientFrom: "#e2e8f0",
    avatarGradientTo: "#cbd5e1",
  },
};

export const useChatColors = () => {
  const [colors, setColors] = useState<ChatColorSettings>(DEFAULT_COLORS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchColors = async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select(
          `
          mentor_bubble_bg,
          mentor_bubble_text,
          mentor_avatar_gradient_from,
          mentor_avatar_gradient_to,
          course_bubble_bg,
          course_bubble_text,
          course_avatar_gradient_from,
          course_avatar_gradient_to
        `
        )
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setColors({
          mentor: {
            bubbleBg: (data as any).mentor_bubble_bg || DEFAULT_COLORS.mentor.bubbleBg,
            bubbleText: (data as any).mentor_bubble_text || DEFAULT_COLORS.mentor.bubbleText,
            avatarGradientFrom: (data as any).mentor_avatar_gradient_from || DEFAULT_COLORS.mentor.avatarGradientFrom,
            avatarGradientTo: (data as any).mentor_avatar_gradient_to || DEFAULT_COLORS.mentor.avatarGradientTo,
          },
          course: {
            bubbleBg: (data as any).course_bubble_bg || DEFAULT_COLORS.course.bubbleBg,
            bubbleText: (data as any).course_bubble_text || DEFAULT_COLORS.course.bubbleText,
            avatarGradientFrom: (data as any).course_avatar_gradient_from || DEFAULT_COLORS.course.avatarGradientFrom,
            avatarGradientTo: (data as any).course_avatar_gradient_to || DEFAULT_COLORS.course.avatarGradientTo,
          },
        });
      }
      setLoading(false);
    };

    fetchColors();
  }, []);

  return { colors, loading, DEFAULT_COLORS };
};

// Helper to generate dynamic Tailwind-compatible classes from hex colors
export const getDynamicChatColors = (colors: ChatColorSettings, isMentor: boolean) => {
  const c = isMentor ? colors.mentor : colors.course;
  return {
    bubbleStyle: { backgroundColor: c.bubbleBg },
    textStyle: { color: c.bubbleText },
    avatarStyle: { background: `linear-gradient(135deg, ${c.avatarGradientFrom}, ${c.avatarGradientTo})` },
    // Keep some static classes for dark mode fallbacks
    inlineCodeClass: isMentor 
      ? "bg-emerald-500/30 text-emerald-900 dark:text-emerald-100" 
      : "bg-muted-foreground/20 text-foreground",
    blockquoteBorderClass: isMentor 
      ? "border-emerald-300" 
      : "border-muted-foreground/50",
  };
};
