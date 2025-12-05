import { supabase } from "@/integrations/supabase/client";

// Get or create session ID
const getSessionId = (): string => {
  const storageKey = "share_session_id";
  let sessionId = sessionStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
};

export const trackPostShare = async (postId: string, platform: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const sessionId = getSessionId();

    await supabase.from("post_shares").insert({
      post_id: postId,
      platform,
      user_id: session?.user?.id || null,
      session_id: sessionId,
    });
  } catch (error) {
    console.error("Error tracking post share:", error);
  }
};
