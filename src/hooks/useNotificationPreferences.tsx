import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  // Admin preferences
  content_submissions: boolean;
  reports: boolean;
  new_users: boolean;
  delete_requests: boolean;
  // Moderator preferences
  content_approved: boolean;
  content_rejected: boolean;
  changes_requested: boolean;
  annotations: boolean;
  // General
  email_notifications: boolean;
}

const defaultPreferences: Omit<NotificationPreferences, 'user_id'> = {
  content_submissions: true,
  reports: true,
  new_users: true,
  delete_requests: true,
  content_approved: true,
  content_rejected: true,
  changes_requested: true,
  annotations: true,
  email_notifications: false,
};

export const useNotificationPreferences = (userId: string | null) => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchPreferences = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences(data as NotificationPreferences);
      } else {
        // Return default preferences if none exist
        setPreferences({
          user_id: userId,
          ...defaultPreferences,
        });
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = async (key: keyof Omit<NotificationPreferences, 'id' | 'user_id'>, value: boolean) => {
    if (!userId || !preferences) return;

    setSaving(true);
    try {
      // Optimistically update UI
      setPreferences(prev => prev ? { ...prev, [key]: value } : null);

      const { data: existingData } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingData) {
        // Update existing preferences
        const { error } = await supabase
          .from("notification_preferences")
          .update({ [key]: value })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Insert new preferences
        const { error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: userId,
            ...defaultPreferences,
            [key]: value,
          });

        if (error) throw error;
      }

      toast({
        title: "Preference updated",
        description: "Your notification preference has been saved.",
      });
    } catch (error) {
      console.error("Error updating notification preference:", error);
      // Revert on error
      setPreferences(prev => prev ? { ...prev, [key]: !value } : null);
      toast({
        title: "Error",
        description: "Failed to update preference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    preferences,
    loading,
    saving,
    updatePreference,
    refetch: fetchPreferences,
  };
};
