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

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAdmin) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch all counts in parallel
        const [
          reportsResult,
          postsResult,
          coursesResult,
          tagsResult,
          commentsResult,
          mediaResult,
          usersResult,
          deleteRequestsResult
        ] = await Promise.all([
          supabase.from("content_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("courses").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("tags").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("comments").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from("media").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
          supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
          supabase.from("delete_requests").select("*", { count: "exact", head: true }).eq("status", "pending")
        ]);

        const totalApprovals = (postsResult.count || 0) + (coursesResult.count || 0) + (tagsResult.count || 0);

        setNotifications({
          reports: reportsResult.count || 0,
          pendingPosts: postsResult.count || 0,
          pendingCourses: coursesResult.count || 0,
          pendingTags: tagsResult.count || 0,
          pendingComments: commentsResult.count || 0,
          mediaLibrary: mediaResult.count || 0,
          newUsers: usersResult.count || 0,
          deleteRequests: deleteRequestsResult.count || 0,
          totalApprovals,
        });
      } catch (error) {
        console.error("Error fetching admin notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();

    if (!isAdmin) return;

    // Set up realtime subscriptions for updates
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_reports' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delete_requests' }, () => fetchNotifications())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, userId]);

  const refetch = async () => {
    if (!isAdmin) return;
    
    setIsLoading(true);
    try {
      const [
        reportsResult,
        postsResult,
        coursesResult,
        tagsResult,
        commentsResult,
        mediaResult,
        usersResult,
        deleteRequestsResult
      ] = await Promise.all([
        supabase.from("content_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("courses").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("tags").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("comments").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("media").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("delete_requests").select("*", { count: "exact", head: true }).eq("status", "pending")
      ]);

      const totalApprovals = (postsResult.count || 0) + (coursesResult.count || 0) + (tagsResult.count || 0);

      setNotifications({
        reports: reportsResult.count || 0,
        pendingPosts: postsResult.count || 0,
        pendingCourses: coursesResult.count || 0,
        pendingTags: tagsResult.count || 0,
        pendingComments: commentsResult.count || 0,
        mediaLibrary: mediaResult.count || 0,
        newUsers: usersResult.count || 0,
        deleteRequests: deleteRequestsResult.count || 0,
        totalApprovals,
      });
    } catch (error) {
      console.error("Error refetching admin notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { notifications, isLoading, refetch };
};
