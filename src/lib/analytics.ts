import { supabase } from "@/integrations/supabase/client";

// Generate or retrieve session ID
const getSessionId = (): string => {
  const sessionKey = 'analytics_session_id';
  let sessionId = sessionStorage.getItem(sessionKey);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(sessionKey, sessionId);
  }
  
  return sessionId;
};

// Detect device type
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Detect browser
const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Unknown';
};

// Get referrer
const getReferrer = (): string => {
  return document.referrer || 'Direct';
};

/**
 * Track a page view
 */
export const trackPageView = async (pagePath: string, pageTitle?: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const analyticsData = {
      page_path: pagePath,
      page_title: pageTitle || document.title,
      user_id: session?.user?.id || null,
      session_id: getSessionId(),
      referrer: getReferrer(),
      device_type: getDeviceType(),
      browser: getBrowser(),
      country: null, // Could be enhanced with IP geolocation
    };

    const { error } = await supabase
      .from('analytics')
      .insert([analyticsData]);

    if (error) {
      console.error('Error tracking page view:', error);
    } else {
      console.log('Page view tracked:', pagePath);
    }
  } catch (error) {
    console.error('Error in trackPageView:', error);
  }
};

/**
 * Track a post view
 */
export const trackPostView = async (postId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const postViewData = {
      post_id: postId,
      user_id: session?.user?.id || null,
      session_id: getSessionId(),
    };

    const { error } = await supabase
      .from('post_views')
      .insert([postViewData]);

    if (error) {
      console.error('Error tracking post view:', error);
    } else {
      console.log('Post view tracked:', postId);
    }
  } catch (error) {
    console.error('Error in trackPostView:', error);
  }
};

/**
 * Track custom event (for future use)
 */
export const trackEvent = async (
  eventName: string,
  eventData?: Record<string, any>
) => {
  console.log('Custom event:', eventName, eventData);
  // Could be extended to track custom events in a separate table
};
