import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AnnotationReply {
  id: string;
  annotation_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_profile?: {
    full_name: string | null;
    email: string;
  };
}

export interface PostAnnotation {
  id: string;
  post_id: string;
  version_id: string | null;
  author_id: string;
  selection_start: number;
  selection_end: number;
  selected_text: string;
  comment: string;
  status: string;
  created_at: string;
  updated_at: string;
  bubble_index: number | null;
  editor_type: string;
  author_profile?: {
    full_name: string | null;
    email: string;
  };
  replies?: AnnotationReply[];
}

export const usePostAnnotations = (postId: string | undefined) => {
  const [annotations, setAnnotations] = useState<PostAnnotation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAnnotations = useCallback(async () => {
    if (!postId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("post_annotations")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch author profiles and replies for each annotation
      const annotationsWithProfilesAndReplies = await Promise.all(
        (data || []).map(async (annotation) => {
          // Fetch author profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", annotation.author_id)
            .single();

          // Fetch replies for this annotation
          const { data: repliesData } = await supabase
            .from("annotation_replies")
            .select("*")
            .eq("annotation_id", annotation.id)
            .order("created_at", { ascending: true });

          // Fetch author profiles for replies
          const repliesWithProfiles = await Promise.all(
            (repliesData || []).map(async (reply) => {
              const { data: replyProfile } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", reply.author_id)
                .single();

              return {
                ...reply,
                author_profile: replyProfile || undefined,
              } as AnnotationReply;
            })
          );

          return {
            ...annotation,
            author_profile: profile || undefined,
            replies: repliesWithProfiles,
          } as PostAnnotation;
        })
      );

      setAnnotations(annotationsWithProfilesAndReplies);
    } catch (error: any) {
      console.error("Error fetching annotations:", error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const createAnnotation = async (
    selectionStart: number,
    selectionEnd: number,
    selectedText: string,
    comment: string,
    editorType: "rich-text" | "chat",
    bubbleIndex?: number,
    versionId?: string
  ) => {
    if (!postId) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("post_annotations")
        .insert({
          post_id: postId,
          version_id: versionId || null,
          author_id: session.user.id,
          selection_start: selectionStart,
          selection_end: selectionEnd,
          selected_text: selectedText,
          comment,
          editor_type: editorType,
          bubble_index: bubbleIndex || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Annotation added",
        description: "Your comment has been added",
      });

      await fetchAnnotations();
      return data;
    } catch (error: any) {
      console.error("Error creating annotation:", error);
      toast({
        title: "Error",
        description: "Failed to add annotation",
        variant: "destructive",
      });
      return null;
    }
  };

  const createReply = async (annotationId: string, content: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("annotation_replies")
        .insert({
          annotation_id: annotationId,
          author_id: session.user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Reply added",
        description: "Your reply has been added",
      });

      await fetchAnnotations();
      return data;
    } catch (error: any) {
      console.error("Error creating reply:", error);
      toast({
        title: "Error",
        description: "Failed to add reply",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteReply = async (replyId: string) => {
    try {
      const { error } = await supabase
        .from("annotation_replies")
        .delete()
        .eq("id", replyId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Reply removed",
      });

      await fetchAnnotations();
      return true;
    } catch (error: any) {
      console.error("Error deleting reply:", error);
      toast({
        title: "Error",
        description: "Failed to delete reply",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateAnnotationStatus = async (
    annotationId: string,
    status: "open" | "resolved" | "dismissed"
  ) => {
    try {
      const { error } = await supabase
        .from("post_annotations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", annotationId);

      if (error) throw error;

      toast({
        title: "Updated",
        description: `Annotation marked as ${status}`,
      });

      await fetchAnnotations();
      return true;
    } catch (error: any) {
      console.error("Error updating annotation:", error);
      toast({
        title: "Error",
        description: "Failed to update annotation",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteAnnotation = async (annotationId: string) => {
    try {
      const { error } = await supabase
        .from("post_annotations")
        .delete()
        .eq("id", annotationId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Annotation removed",
      });

      await fetchAnnotations();
      return true;
    } catch (error: any) {
      console.error("Error deleting annotation:", error);
      toast({
        title: "Error",
        description: "Failed to delete annotation",
        variant: "destructive",
      });
      return false;
    }
  };

  const openAnnotations = annotations.filter(a => a.status === "open");
  const resolvedAnnotations = annotations.filter(a => a.status === "resolved");

  return {
    annotations,
    openAnnotations,
    resolvedAnnotations,
    loading,
    fetchAnnotations,
    createAnnotation,
    createReply,
    deleteReply,
    updateAnnotationStatus,
    deleteAnnotation,
  };
};
