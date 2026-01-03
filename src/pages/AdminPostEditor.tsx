import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import RichTextEditor from "@/components/RichTextEditor";
import { ChatStyleEditor } from "@/components/chat-editor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { usePostVersions, PostVersion } from "@/hooks/usePostVersions";
import { usePostAnnotations } from "@/hooks/usePostAnnotations";
import { useAutoSaveDraft } from "@/hooks/useAutoSaveDraft";
import AdminLayout from "@/components/AdminLayout";
import { AdminEditorSkeleton } from "@/components/admin/AdminEditorSkeleton";
import { ContentStatusBadge, ContentStatus } from "@/components/ContentStatusBadge";
import VersionHistoryPanel from "@/components/VersionHistoryPanel";
import { AnnotationPanel } from "@/components/annotations";
import AdminEditBanner from "@/components/AdminEditBanner";
import SideBySideComparison from "@/components/SideBySideComparison";
import VersionDiffViewer from "@/components/VersionDiffViewer";
import { VersioningNoteDialog, VersioningNoteType } from "@/components/VersioningNoteDialog";
import { ArrowLeft, Save, X, FileText, MessageCircle, Palette, Send, AlertCircle, Eye, ChevronDown, ChevronLeft, Settings2, Loader2, Check } from "lucide-react";
import { CODE_THEMES, CodeTheme } from "@/hooks/useCodeTheme";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isChatTranscript } from "@/lib/chatContent";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const postSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  slug: z.string().min(1, "Slug is required").max(200),
  excerpt: z.string().max(500, "Excerpt too long").optional(),
  content: z.string().min(1, "Content is required"),
  featured_image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  category_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["draft", "published", "pending", "rejected", "changes_requested"]),
  lesson_order: z.number().int().min(0).optional(),
  parent_id: z.string().uuid().optional().or(z.literal("")).or(z.literal("none")),
});

interface Category {
  id: string;
  name: string;
}

interface Post {
  id: string;
  title: string;
  category_id: string | null;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

const AdminPostEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isModerator, userId, isLoading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(!!id);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mainLessons, setMainLessons] = useState<Post[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [editorType, setEditorType] = useState<"rich" | "chat">("rich");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image: "",
    category_id: "",
    status: "draft" as "draft" | "published" | "pending" | "rejected" | "changes_requested",
    lesson_order: 0,
    parent_id: "none",
    code_theme: "" as string,
  });
  const [originalAuthorId, setOriginalAuthorId] = useState<string | null>(null);
  const [postDbContent, setPostDbContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [didSyncLatestVersion, setDidSyncLatestVersion] = useState(false);
  const [selectedText, setSelectedText] = useState<{
    start: number;
    end: number;
    text: string;
    type?: "paragraph" | "code" | "conversation";
    bubbleIndex?: number;
  } | null>(null);
  const [previewVersion, setPreviewVersion] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showAdminChangesDialog, setShowAdminChangesDialog] = useState(false);
  const [showPublishPreviewDialog, setShowPublishPreviewDialog] = useState(false);
  const [showVersioningNoteDialog, setShowVersioningNoteDialog] = useState(false);
  const [dismissedAdminBanner, setDismissedAdminBanner] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const previousContentRef = useRef<string>("");

  // Version and annotation hooks
  const { versions, loading: versionsLoading, metadata, saveVersion, saveVersionAsDraft, saveVersionOnPublish, createInitialVersion, publishVersion, restoreVersion, updateVersionNote } = usePostVersions(id);
  const { annotations, loading: annotationsLoading, createAnnotation, createReply, deleteReply, updateAnnotationStatus, deleteAnnotation } = usePostAnnotations(id);

  // Auto-save draft hook - saves content to localStorage with debounce
  const draftKey = id ? `post_${id}` : `new_post_${formData.slug || 'untitled'}`;
  const { loadDraft, clearDraft, status: autoSaveStatus } = useAutoSaveDraft(draftKey, formData.content, true);

  // Load draft on mount for new posts or if content is empty
  useEffect(() => {
    if (!loading && !formData.content) {
      const savedDraft = loadDraft();
      if (savedDraft) {
        setFormData(prev => ({ ...prev, content: savedDraft }));
        toast({
          title: "Draft restored",
          description: "Your previous work has been recovered",
        });
      }
    }
  }, [loading, loadDraft]);

  // Check if moderator should see admin edit banner
  const shouldShowAdminBanner = !isAdmin && isModerator && metadata.hasAdminEdits && !dismissedAdminBanner && metadata.lastAdminEdit;

  useEffect(() => {
    if (!roleLoading && !isAdmin && !isModerator) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [roleLoading, isAdmin, isModerator]);

  useEffect(() => {
    if (!roleLoading && (isAdmin || isModerator)) {
      const loadData = async () => {
        // Fetch all data in parallel
        const promises = [fetchCategories(), fetchMainLessons(), fetchTags()];

        if (id) {
          promises.push(fetchPost(id));
          promises.push(fetchPostTags(id));
        }

        await Promise.all(promises);

        // Only set loading to false after all data is loaded (for new posts)
        if (!id) {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [id, isAdmin, isModerator, roleLoading]);

  // Reset version sync when navigating between posts
  useEffect(() => {
    setDidSyncLatestVersion(false);
  }, [id]);

  // By default, load the most recently edited version into the editor
  useEffect(() => {
    if (!id || versionsLoading || didSyncLatestVersion) return;
    if (versions.length === 0) return;

    const latest = versions[0];
    setFormData((prev) => ({ ...prev, content: latest.content }));
    setOriginalContent(latest.content);
    previousContentRef.current = latest.content;

    if (latest.content && isChatTranscript(latest.content)) {
      setEditorType("chat");
    }

    setDidSyncLatestVersion(true);
  }, [id, versionsLoading, versions, didSyncLatestVersion]);
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchMainLessons = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, category_id")
        .is("parent_id", null)
        .order("title");

      if (error) throw error;
      setMainLessons(data || []);
    } catch (error: any) {
      console.error("Error fetching main lessons:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (error) throw error;
      setAllTags(data || []);
    } catch (error: any) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchPostTags = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from("post_tags")
        .select("tag_id, tags(id, name, slug)")
        .eq("post_id", postId);

      if (error) throw error;
      
      const tags = data?.map(item => (item.tags as any)) || [];
      setSelectedTags(tags);
    } catch (error: any) {
      console.error("Error fetching post tags:", error);
    }
  };

  const fetchPost = async (postId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (error) throw error;
      
      if (data) {
        // Check if moderator is trying to edit someone else's post
        if (isModerator && !isAdmin && data.author_id !== userId) {
          toast({
            title: "Access Denied",
            description: "You can only edit your own posts",
            variant: "destructive",
          });
          navigate("/admin/posts");
          return;
        }

        setOriginalAuthorId(data.author_id);

        // Avoid overwriting content if the editor already synced the latest version.
        // This prevents the editor from briefly showing the DB content and then swapping.
        setFormData((prev) => ({
          ...prev,
          title: data.title || "",
          slug: data.slug || "",
          excerpt: data.excerpt || "",
          content: prev.content ? prev.content : (data.content || ""),
          featured_image: data.featured_image || "",
          category_id: data.category_id || "",
          status: (data.status as any) || "draft",
          lesson_order: data.lesson_order || 0,
          parent_id: data.parent_id || "none",
          code_theme: data.code_theme || "",
        }));

        // Store original post content (used to infer the live/published version in history)
        setPostDbContent(data.content || "");

        // Store original content for change detection (don't override if versions already set it)
        setOriginalContent((prev) => prev || (data.content || ""));
        if (!previousContentRef.current) {
          previousContentRef.current = data.content || "";
        }

        if (data.content && isChatTranscript(data.content)) {
          setEditorType("chat");
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load post",
        variant: "destructive",
      });
      navigate("/admin/posts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (submitForApproval: boolean = false) => {
    try {
      setLoading(true);
      
      // Determine status - Moderators can only create drafts or submit for approval
      let status = formData.status;
      if (isModerator && !isAdmin) {
        // Moderators can only set draft or pending status
        if (submitForApproval) {
          status = "pending";
        } else {
          status = "draft";
        }
      } else if (submitForApproval) {
        status = "pending";
      }

      const validated = postSchema.parse({ ...formData, status });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const postData = {
        title: validated.title,
        slug: validated.slug,
        excerpt: validated.excerpt || null,
        content: validated.content,
        featured_image: validated.featured_image || null,
        category_id: validated.category_id || null,
        status: validated.status,
        author_id: originalAuthorId || session.user.id,
        published_at: validated.status === "published" ? new Date().toISOString() : null,
        lesson_order: validated.lesson_order || 0,
        parent_id: validated.parent_id && validated.parent_id !== "" && validated.parent_id !== "none" ? validated.parent_id : null,
        code_theme: formData.code_theme || null,
      };

      let postId = id;
      const isPublishing = validated.status === "published";

      if (id) {
        // Update existing post
        const { error } = await supabase
          .from("posts")
          .update(postData)
          .eq("id", id);

        if (error) throw error;

        // Save version on publish (every publish creates a new version)
        if (isPublishing) {
          await saveVersionOnPublish(
            formData.content,
            editorType === "chat" ? "chat" : "rich-text"
          );
        } else if (formData.content !== previousContentRef.current) {
          // Save draft version if content changed but not publishing
          await saveVersionAsDraft(
            formData.content,
            editorType === "chat" ? "chat" : "rich-text"
          );
        }
        previousContentRef.current = formData.content;
      } else {
        // Create new post
        const { data: newPost, error } = await supabase
          .from("posts")
          .insert([postData])
          .select()
          .single();

        if (error) throw error;
        postId = newPost.id;

        // Always create v0 as initial version
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user && postId) {
          await supabase
            .from("post_versions")
            .insert({
              post_id: postId,
              version_number: 0,
              content: formData.content,
              editor_type: editorType === "chat" ? "chat" : "rich-text",
              edited_by: currentSession.user.id,
              editor_role: isAdmin ? "admin" : "moderator",
              change_summary: "Initial version (v0)",
              is_published: isPublishing,
            });
        }
      }

      // Save tags
      if (postId) {
        await savePostTags(postId);
      }

      // Record approval history if submitting for approval
      if (submitForApproval && postId) {
        await supabase.from("approval_history").insert({
          content_type: "post",
          content_id: postId,
          action: "submitted",
          performed_by: session.user.id,
        });
      }

      // Clear auto-saved draft on successful save
      clearDraft();

      toast({
        title: "Success",
        description: submitForApproval 
          ? "Post submitted for approval" 
          : (id ? "Post updated successfully" : "Post created successfully"),
      });

      navigate("/admin/posts");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const savePostTags = async (postId: string) => {
    try {
      // Delete existing tags
      await supabase
        .from("post_tags")
        .delete()
        .eq("post_id", postId);

      // Insert new tags
      if (selectedTags.length > 0) {
        const postTagsData = selectedTags.map(tag => ({
          post_id: postId,
          tag_id: tag.id,
        }));

        const { error } = await supabase
          .from("post_tags")
          .insert(postTagsData);

        if (error) throw error;
      }
    } catch (error: any) {
      console.error("Error saving post tags:", error);
      throw error;
    }
  };

  const handleAddTag = async () => {
    if (!tagInput.trim()) return;

    const tagName = tagInput.trim();
    const tagSlug = generateSlug(tagName);

    // Check if tag already exists
    let tag = allTags.find(t => t.slug === tagSlug);

    if (!tag) {
      // Create new tag
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase
          .from("tags")
          .insert([{ 
            name: tagName, 
            slug: tagSlug,
            author_id: session?.user.id,
            status: isAdmin ? "approved" : "pending"
          }])
          .select()
          .single();

        if (error) throw error;
        tag = data;
        setAllTags([...allTags, data]);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to create tag",
          variant: "destructive",
        });
        return;
      }
    }

    // Add tag to selected tags if not already added
    if (tag && !selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }

    setTagInput("");
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId));
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // Check if moderator can only save as draft or submit for approval
  const canPublishDirectly = isAdmin;
  const showSubmitForApproval = isModerator && !isAdmin;

  // Handle text selection for annotations (admin only)
  // Handle text selection for annotations (admin and moderators)
  const handleTextSelection = useCallback((type: "paragraph" | "code" | "conversation" = "paragraph", bubbleIndex?: number) => {
    // Admins can annotate anything, moderators only paragraphs and code
    if (!isAdmin && !isModerator) return;
    if (isModerator && !isAdmin && type === "conversation") return;
    
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString();
      const range = selection.getRangeAt(0);
      setSelectedText({
        start: range.startOffset,
        end: range.endOffset,
        text,
        type,
        bubbleIndex,
      });
    }
  }, [isAdmin, isModerator]);

  // Handle version actions
  const handleRestoreVersion = async (version: any) => {
    const restoredContent = await restoreVersion(version);
    if (restoredContent) {
      setFormData(prev => ({ ...prev, content: restoredContent }));
      toast({
        title: "Version Restored",
        description: `Restored to version ${version.version_number}`,
      });
    }
  };

  const handlePublishVersion = async (version: any) => {
    const success = await publishVersion(version.id, version.content);
    if (success) {
      setFormData(prev => ({ ...prev, content: version.content, status: "published" }));
    }
  };

  const handlePreviewVersion = (version: any) => {
    setPreviewVersion(version);
    setShowPreviewDialog(true);
  };

  // Get the currently published version for comparison
  const publishedVersion = versions.find(v => v.status === "published");
  const hasContentChanges = formData.content !== originalContent && originalContent !== "";

  // Create a mock version object for the current editor content
  const currentEditorVersion = {
    id: "current",
    post_id: id || "",
    version_number: versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1,
    content: formData.content,
    editor_type: editorType === "chat" ? "chat" : "rich-text",
    edited_by: userId || "",
    editor_role: isAdmin ? "admin" : "moderator",
    created_at: new Date().toISOString(),
    status: "draft",
    change_summary: null,
    versioning_note_type: null,
    versioning_note_locked: false,
    editor_profile: undefined,
  } as PostVersion;

  // Handle publish with preview
  const handlePublishWithPreview = () => {
    if (hasContentChanges && publishedVersion) {
      setShowPublishPreviewDialog(true);
    } else {
      // No changes to show, just publish directly
      handleConfirmPublish();
    }
  };

  const handleConfirmPublish = async () => {
    setShowPublishPreviewDialog(false);
    setFormData(prev => ({ ...prev, status: "published" }));
    // Wait for state update then submit
    setTimeout(() => {
      handleSubmit(false);
    }, 0);
  };

  // Handle annotation creation with type support
  const handleAddAnnotation = async (
    selectionStart: number,
    selectionEnd: number,
    selectedTextStr: string,
    comment: string,
    annotationType?: "paragraph" | "code" | "conversation"
  ) => {
    // Get bubble index from selected text if it's a conversation annotation
    const bubbleIndex = selectedText?.bubbleIndex;
    
    await createAnnotation(
      selectionStart,
      selectionEnd,
      selectedTextStr,
      comment,
      editorType === "chat" ? "chat" : "rich-text",
      bubbleIndex
    );
  };

  // Check if content has admin edits (different from original)
  const hasAdminEdits = isAdmin && id && formData.content !== originalContent && originalContent !== "";

  const editorInitLoading =
    roleLoading ||
    loading ||
    (id ? versionsLoading || (versions.length > 0 && !didSyncLatestVersion) : false);

  if (editorInitLoading) {
    return (
      <AdminLayout defaultSidebarCollapsed>
        <AdminEditorSkeleton type="post" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout defaultSidebarCollapsed>
      <div className="flex gap-6 h-full">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/admin/posts")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Posts
              </Button>
              <h1 className="text-3xl font-bold">
                {id ? "Edit Post" : "Create New Post"}
              </h1>
              {formData.status && formData.status !== "draft" && (
                <ContentStatusBadge status={formData.status as ContentStatus} />
              )}
              {/* Autosave Status Indicator */}
              {autoSaveStatus === 'saving' && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving…</span>
                </div>
              )}
              {autoSaveStatus === 'saved' && (
                <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved</span>
                </div>
              )}
            </div>
            
            {/* Version and Annotation Controls */}
            {id && (
              <div className="flex items-center gap-2">
                <VersionHistoryPanel
                  versions={versions}
                  loading={versionsLoading}
                  isAdmin={isAdmin}
                  currentContent={formData.content}
                  liveContent={postDbContent}
                  onRestore={handleRestoreVersion}
                  onPublish={handlePublishVersion}
                  onPreview={handlePreviewVersion}
                  onUpdateNote={updateVersionNote}
                />
                <AnnotationPanel
                  annotations={annotations}
                  loading={annotationsLoading}
                  isAdmin={isAdmin}
                  isModerator={isModerator}
                  userId={userId}
                  onAddAnnotation={handleAddAnnotation}
                  onUpdateStatus={updateAnnotationStatus}
                  onDelete={deleteAnnotation}
                  onAddReply={createReply}
                  onDeleteReply={deleteReply}
                  selectedText={selectedText}
                  onClearSelection={() => setSelectedText(null)}
                />
              </div>
            )}
          </div>

          {/* Admin edit notification banner for moderators */}
          {shouldShowAdminBanner && metadata.lastAdminEdit && (
            <AdminEditBanner
              lastAdminEdit={metadata.lastAdminEdit}
              onViewChanges={() => setShowAdminChangesDialog(true)}
              onDismiss={() => setDismissedAdminBanner(true)}
            />
          )}

          {/* Admin edit warning (shown to admins) */}
          {hasAdminEdits && (
            <div className="flex items-center gap-2 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                You have made changes to this moderator's post. Changes will be highlighted for the author.
              </span>
            </div>
          )}

          {/* Open annotations indicator */}
          {annotations.filter(a => a.status === "open").length > 0 && !isAdmin && (
            <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-800 dark:text-red-200">
                You have {annotations.filter(a => a.status === "open").length} pending feedback comments from admin. Check the Annotations panel.
              </span>
            </div>
          )}

          <Collapsible defaultOpen={!id} className="space-y-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Post Details</span>
                {formData.title && (
                  <Badge variant="secondary" className="text-xs">
                    {formData.title.length > 30 ? formData.title.slice(0, 30) + "..." : formData.title}
                  </Badge>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div>
                <Label htmlFor="title" className="text-base">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (!id) {
                      setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
                    }
                  }}
                  placeholder="Enter post title..."
                  className="text-lg h-12"
                />
              </div>

              <div>
                <Label htmlFor="slug" className="text-base">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="post-url-slug"
                />
              </div>

              <div>
                <Label htmlFor="excerpt" className="text-base">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Brief description of the post..."
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <Label htmlFor="content" className="text-base">Content</Label>
              <Tabs value={editorType} onValueChange={(v) => setEditorType(v as "rich" | "chat")}>
                <TabsList className="h-9">
                  <TabsTrigger value="rich" className="text-xs px-3 gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Rich Editor
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="text-xs px-3 gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Chat Style
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {editorType === "rich" ? (
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Write your post content here..."
                onTextSelect={(selection) => {
                  if (!id) return; // Only allow annotations on existing posts
                  if (!isAdmin && !isModerator) return;
                  setSelectedText({
                    start: selection.start,
                    end: selection.end,
                    text: selection.text,
                    type: selection.type,
                  });
                }}
              />
            ) : (
              <ChatStyleEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                courseType={
                  categories.find(c => c.id === formData.category_id)?.name?.toLowerCase().replace(/\s+/g, '') || "python"
                }
                placeholder="Start a conversation..."
                codeTheme={formData.code_theme}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar with Vertical Tab Toggle */}
        <div className="flex-shrink-0 flex">
          {/* Vertical Tab Toggle - Always visible */}
          <button
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="flex flex-col items-center justify-start gap-1 py-3 px-1 bg-muted/50 hover:bg-muted border-y border-l rounded-l-md transition-colors cursor-pointer sticky top-6 h-fit"
          >
            <ChevronLeft className={`h-4 w-4 text-muted-foreground transition-transform ${rightSidebarOpen ? '' : 'rotate-180'}`} />
            <span className="text-[10px] font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180 select-none">
              Settings
            </span>
          </button>

          {/* Sidebar Content */}
          <Card className={`flex flex-col min-h-0 transition-all duration-300 rounded-l-none border-l-0 sticky top-6 h-fit ${rightSidebarOpen ? 'w-80 p-4' : 'w-0 overflow-hidden border-0 p-0'}`}>
            <div className={`space-y-4 ${!rightSidebarOpen ? 'hidden' : ''}`}>
            {/* Action Buttons */}
            <div className="space-y-2">
              {canPublishDirectly ? (
                <>
                  {/* Show Publish Changes with preview if editing existing post with changes */}
                  {id && hasContentChanges && formData.status === "published" ? (
                    <Button
                      onClick={handlePublishWithPreview}
                      disabled={loading}
                      className="w-full"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Publish Changes
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubmit(false)}
                      disabled={loading}
                      className="w-full"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {id ? "Update" : "Publish"}
                    </Button>
                  )}
                  {/* Save as draft option when editing */}
                  {id && (
                    <Button
                      onClick={() => setShowVersioningNoteDialog(true)}
                      disabled={loading}
                      variant="outline"
                      className="w-full"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save as Draft
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  {showSubmitForApproval && (
                    <Button
                      onClick={() => handleSubmit(true)}
                      disabled={loading}
                      className="w-full"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Submit for Approval
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="ghost"
                onClick={() => navigate("/admin/posts")}
                disabled={loading}
                className="w-full"
              >
                Cancel
              </Button>
            </div>

            {/* Status - Only show to admins */}
            {canPublishDirectly && (
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="changes_requested">Changes Requested</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="category">Course</Label>
              <Select 
                value={formData.category_id || "none"} 
                onValueChange={(value) => setFormData({ ...formData, category_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No course</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="parent">Parent Lesson</Label>
              <Select 
                value={formData.parent_id} 
                onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No parent (main lesson)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (main lesson)</SelectItem>
                  {mainLessons
                    .filter(lesson => lesson.id !== id)
                    .map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lesson_order">Lesson Order</Label>
              <Input
                id="lesson_order"
                type="number"
                min="0"
                value={formData.lesson_order}
                onChange={(e) => setFormData({ ...formData, lesson_order: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="featured_image">Featured Image URL</Label>
              <Input
                id="featured_image"
                value={formData.featured_image}
                onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Code Theme
              </Label>
              <Select 
                value={formData.code_theme || "default"} 
                onValueChange={(value) => setFormData({ ...formData, code_theme: value === "default" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use site default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use site default</SelectItem>
                  {CODE_THEMES.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  placeholder="Add a tag..."
                />
                <Button type="button" onClick={handleAddTag} size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedTags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="gap-1">
                    {tag.name}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleRemoveTag(tag.id)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Version Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version {previewVersion?.version_number} Preview</DialogTitle>
            <DialogDescription>
              Preview of content from this version
            </DialogDescription>
          </DialogHeader>
          <div className="prose dark:prose-invert max-w-none mt-4">
            <div dangerouslySetInnerHTML={{ __html: previewVersion?.content || "" }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Changes Side-by-Side Dialog */}
      <Dialog open={showAdminChangesDialog} onOpenChange={setShowAdminChangesDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Admin Changes Review</DialogTitle>
            <DialogDescription>
              Compare the previous version with the admin's updates
            </DialogDescription>
          </DialogHeader>
          {metadata.lastAdminEdit && versions.length >= 2 && (
            <SideBySideComparison
              oldVersion={versions.find(v => v.version_number === metadata.lastAdminEdit!.version_number - 1) || versions[1]}
              newVersion={metadata.lastAdminEdit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Publish Changes Preview Dialog */}
      <Dialog open={showPublishPreviewDialog} onOpenChange={setShowPublishPreviewDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Review Changes Before Publishing
            </DialogTitle>
            <DialogDescription>
              Review the differences between the current published version and your changes
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="side-by-side" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-fit">
              <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
              <TabsTrigger value="inline">Inline Diff</TabsTrigger>
            </TabsList>
            
            <TabsContent value="side-by-side" className="flex-1 overflow-hidden mt-4">
              {publishedVersion && (
                <SideBySideComparison
                  oldVersion={publishedVersion}
                  newVersion={currentEditorVersion}
                />
              )}
            </TabsContent>
            
            <TabsContent value="inline" className="flex-1 overflow-hidden mt-4">
              {publishedVersion && (
                <VersionDiffViewer
                  currentVersion={currentEditorVersion}
                  compareVersion={publishedVersion}
                />
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPublishPreviewDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPublish}
              disabled={loading}
            >
              <Send className="mr-2 h-4 w-4" />
              Confirm & Publish
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Versioning Note Dialog */}
      <VersioningNoteDialog
        open={showVersioningNoteDialog}
        onOpenChange={setShowVersioningNoteDialog}
        loading={savingDraft}
        onSave={async (noteType: VersioningNoteType, changeSummary: string) => {
          setSavingDraft(true);
          try {
            const saved = await saveVersionAsDraft(
              formData.content,
              editorType === "chat" ? "chat" : "rich-text",
              changeSummary,
              noteType
            );

            if (saved) {
              previousContentRef.current = formData.content;
              setShowVersioningNoteDialog(false);
              toast({
                title: "Draft saved",
                description: "Saved as a private draft version (not live).",
              });
            }
          } finally {
            setSavingDraft(false);
          }
        }}
      />
    </AdminLayout>
  );
};

export default AdminPostEditor;
