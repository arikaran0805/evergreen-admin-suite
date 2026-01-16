/**
 * useRoleNotifications - Role-Scoped Notification Hook
 * 
 * Fetches notifications based on the user's activeRole.
 * Each role sees ONLY notifications relevant to their scope:
 * - ADMIN: All system notifications (admin_notifications table)
 * - SUPER_MODERATOR/SENIOR_MODERATOR/MODERATOR: Personal notifications (moderator_notifications table)
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth, AppRole } from "@/hooks/useAuth";

export interface RoleNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  content_id: string | null;
  content_type: string | null;
  is_read: boolean;
  created_at: string;
}

interface UseRoleNotificationsReturn {
  notifications: RoleNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useRoleNotifications = (): UseRoleNotificationsReturn => {
  const { userId, activeRole } = useAuth();
  const [notifications, setNotifications] = useState<RoleNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const isAdmin = activeRole === "admin";

  const fetchNotifications = useCallback(async () => {
    if (!userId || !activeRole) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;

      if (isAdmin) {
        result = await supabase
          .from("admin_notifications")
          .select("*")
          .eq("admin_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);
      } else {
        result = await supabase
          .from("moderator_notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);
      }

      if (result.error) throw result.error;
      const data = result.data || [];

      // Normalize the data structure
      const normalizedData: RoleNotification[] = data.map((n: any) => ({
        id: n.id,
        user_id: isAdmin ? n.admin_id : n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        content_id: n.content_id,
        content_type: n.content_type,
        is_read: n.is_read,
        created_at: n.created_at,
      }));

      setNotifications(normalizedData);
      setUnreadCount(normalizedData.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error(`Error fetching ${activeRole} notifications:`, err);
    } finally {
      setLoading(false);
    }
  }, [userId, activeRole, isAdmin]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId || !activeRole) return;

    const table = isAdmin ? "admin_notifications" : "moderator_notifications";
    const userIdColumn = isAdmin ? "admin_id" : "user_id";
    const channelName = `role-notifications-${activeRole}-${userId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: table,
          filter: `${userIdColumn}=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as any;
          const normalized: RoleNotification = {
            id: newNotification.id,
            user_id: isAdmin ? newNotification.admin_id : newNotification.user_id,
            type: newNotification.type,
            title: newNotification.title,
            message: newNotification.message,
            content_id: newNotification.content_id,
            content_type: newNotification.content_type,
            is_read: newNotification.is_read,
            created_at: newNotification.created_at,
          };

          setNotifications((prev) => [normalized, ...prev]);
          setUnreadCount((prev) => prev + 1);

          toast({
            title: normalized.title,
            description: normalized.message || undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeRole, isAdmin, toast]);

  const markAsRead = async (notificationId: string) => {
    if (!activeRole) return;

    try {
      if (isAdmin) {
        const { error } = await supabase
          .from("admin_notifications")
          .update({ is_read: true })
          .eq("id", notificationId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("moderator_notifications")
          .update({ is_read: true })
          .eq("id", notificationId);
        if (error) throw error;
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!userId || !activeRole) return;

    try {
      if (isAdmin) {
        const { error } = await supabase
          .from("admin_notifications")
          .update({ is_read: true })
          .eq("admin_id", userId)
          .eq("is_read", false);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("moderator_notifications")
          .update({ is_read: true })
          .eq("user_id", userId)
          .eq("is_read", false);
        if (error) throw error;
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!activeRole) return;

    try {
      const notification = notifications.find((n) => n.id === notificationId);

      if (isAdmin) {
        const { error } = await supabase
          .from("admin_notifications")
          .delete()
          .eq("id", notificationId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("moderator_notifications")
          .delete()
          .eq("id", notificationId);
        if (error) throw error;
      }

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
};

export default useRoleNotifications;
