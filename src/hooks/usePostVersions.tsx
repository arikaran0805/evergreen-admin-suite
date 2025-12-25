import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

export interface PostVersion {
  id: string;
  post_id: string;
  version_number: number;
  content: string;
  editor_type: string;
  edited_by: string;
  editor_role: "admin" | "moderator";
  created_at: string;
  is_published: boolean;
  change_summary: string | null;
  editor_profile?: {
    full_name: string | null;
    email: string;
  };
}

export interface VersionMetadata {
  hasAdminEdits: boolean;
  lastAdminEdit?: PostVersion;
  originalAuthorRole: "admin" | "moderator" | null;
}

export const usePostVersions = (postId: string | undefined) => {
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<PostVersion | null>(null);
  const [metadata, setMetadata] = useState<VersionMetadata>({
    hasAdminEdits: false,
    lastAdminEdit: undefined,
    originalAuthorRole: null,
  });
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

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
            editor_role: version.editor_role || "moderator",
            editor_profile: profile || undefined,
          } as PostVersion;
        })
      );

      setVersions(versionsWithProfiles);

      // Compute metadata
      const adminEdits = versionsWithProfiles.filter(v => v.editor_role === "admin");
      const hasAdminEdits = adminEdits.length > 0;
      const lastAdminEdit = adminEdits[0];
      
      // First version determines original author role
      const firstVersion = versionsWithProfiles[versionsWithProfiles.length - 1];
      const originalAuthorRole = firstVersion?.editor_role || null;

      setMetadata({
        hasAdminEdits,
        lastAdminEdit,
        originalAuthorRole,
      });
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

      // Determine editor role
      const editorRole = isAdmin ? "admin" : "moderator";

      const { data, error } = await supabase
        .from("post_versions")
        .insert({
          post_id: postId,
          version_number: nextVersionNumber,
          content,
          editor_type: editorType,
          edited_by: session.user.id,
          editor_role: editorRole,
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

  // Get versions with admin changes after a specific version
  const getAdminChangesAfterVersion = (versionNumber: number): PostVersion[] => {
    return versions.filter(
      v => v.version_number > versionNumber && v.editor_role === "admin"
    );
  };

  // Check if moderator's content was edited by admin
  const wasEditedByAdmin = (moderatorVersionNumber: number): boolean => {
    return versions.some(
      v => v.version_number > moderatorVersionNumber && v.editor_role === "admin"
    );
  };

  return {
    versions,
    loading,
    currentVersion,
    metadata,
    fetchVersions,
    saveVersion,
    publishVersion,
    restoreVersion,
    getAdminChangesAfterVersion,
    wasEditedByAdmin,
  };
};
