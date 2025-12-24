import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PostVersion {
  id: string;
  post_id: string;
  version_number: number;
  content: string;
  editor_type: string;
  edited_by: string;
  created_at: string;
  is_published: boolean;
  change_summary: string | null;
  editor_profile?: {
    full_name: string | null;
    email: string;
  };
}

export const usePostVersions = (postId: string | undefined) => {
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<PostVersion | null>(null);
  const { toast } = useToast();

  const fetchVersions = useCallback(async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("post_versions")
        .select("*")
        .eq("post_id", postId)
        .order("version_number", { ascending: false });

      if (error) throw error;

      // Fetch editor profiles separately
      const versionsWithProfiles = await Promise.all(
        (data || []).map(async (version) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", version.edited_by)
            .single();

          return {
            ...version,
            editor_profile: profile || undefined,
          } as PostVersion;
        })
      );

      setVersions(versionsWithProfiles);
    } catch (error: any) {
      console.error("Error fetching versions:", error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const saveVersion = async (
    content: string,
    editorType: "rich-text" | "chat",
    changeSummary?: string
  ) => {
    if (!postId) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      // Get the next version number
      const nextVersionNumber = versions.length > 0 
        ? Math.max(...versions.map(v => v.version_number)) + 1 
        : 1;

      const { data, error } = await supabase
        .from("post_versions")
        .insert({
          post_id: postId,
          version_number: nextVersionNumber,
          content,
          editor_type: editorType,
          edited_by: session.user.id,
          change_summary: changeSummary,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchVersions();
      return data;
    } catch (error: any) {
      console.error("Error saving version:", error);
      toast({
        title: "Error",
        description: "Failed to save version",
        variant: "destructive",
      });
      return null;
    }
  };

  const publishVersion = async (versionId: string, postContent: string) => {
    if (!postId) return false;

    try {
      // Update post content with this version's content
      const { error: postError } = await supabase
        .from("posts")
        .update({ 
          content: postContent,
          status: "published",
          published_at: new Date().toISOString()
        })
        .eq("id", postId);

      if (postError) throw postError;

      // Mark this version as published
      const { error: versionError } = await supabase
        .from("post_versions")
        .update({ is_published: true })
        .eq("id", versionId);

      if (versionError) throw versionError;

      // Unmark other versions
      await supabase
        .from("post_versions")
        .update({ is_published: false })
        .eq("post_id", postId)
        .neq("id", versionId);

      toast({
        title: "Published",
        description: "Version published successfully",
      });

      await fetchVersions();
      return true;
    } catch (error: any) {
      console.error("Error publishing version:", error);
      toast({
        title: "Error",
        description: "Failed to publish version",
        variant: "destructive",
      });
      return false;
    }
  };

  const restoreVersion = async (version: PostVersion) => {
    setCurrentVersion(version);
    return version.content;
  };

  return {
    versions,
    loading,
    currentVersion,
    fetchVersions,
    saveVersion,
    publishVersion,
    restoreVersion,
  };
};
