import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminNotifications {
  reports: number;
  pendingPosts: number;
  pendingCourses: number;
  pendingTags: number;
  pendingComments: number;
  mediaLibrary: number;
  newUsers: number;
  deleteRequests: number;
  totalApprovals: number;
}

export const useAdminNotifications = (isAdmin: boolean, userId: string | null) => {
  const [notifications, setNotifications] = useState<AdminNotifications>({
    reports: 0,
    pendingPosts: 0,
    pendingCourses: 0,
    pendingTags: 0,
    pendingComments: 0,
    mediaLibrary: 0,
    newUsers: 0,
    deleteRequests: 0,
    totalApprovals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch pending reports
      const { count: reportsCount } = await supabase
        .from("content_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch pending posts (by moderators)
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch pending courses (by moderators)
      const { count: coursesCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch pending tags (by moderators)
      const { count: tagsCount } = await supabase
        .from("tags")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch pending comments (need approval)
      const { count: commentsCount } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch new media uploads (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { count: mediaCount } = await supabase
        .from("media")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday.toISOString());

      // Fetch new users (last 24 hours)
      const { count: newUsersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday.toISOString());

      // Fetch pending delete requests
      const { count: deleteRequestsCount } = await supabase
        .from("delete_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const totalApprovals = (postsCount || 0) + (coursesCount || 0) + (tagsCount || 0);

      setNotifications({
        reports: reportsCount || 0,
        pendingPosts: postsCount || 0,
        pendingCourses: coursesCount || 0,
        pendingTags: tagsCount || 0,
        pendingComments: commentsCount || 0,
        mediaLibrary: mediaCount || 0,
        newUsers: newUsersCount || 0,
        deleteRequests: deleteRequestsCount || 0,
        totalApprovals,
      });
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up realtime subscriptions for updates
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_reports' }, fetchNotifications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchNotifications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, fetchNotifications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, fetchNotifications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchNotifications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchNotifications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delete_requests' }, fetchNotifications)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, userId]);

  return { notifications, isLoading, refetch: fetchNotifications };
};
