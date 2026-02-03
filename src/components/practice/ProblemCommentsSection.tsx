import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Trash2, Reply, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useProblemComments, ProblemComment } from "@/hooks/useProblemComments";
import { toast } from "sonner";
import { LightEditor } from "@/components/tiptap";

interface ProblemCommentsSectionProps {
  problemId: string;
}

// Helper to extract text from TipTap JSON or plain text
function extractTextContent(content: string): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    if (parsed?.content) {
      return parsed.content
        .map((node: any) => {
          if (node.type === "paragraph" && node.content) {
            return node.content.map((c: any) => c.text || "").join("");
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");
    }
    return content;
  } catch {
    return content;
  }
}

// Helper to check if content is empty
function isContentEmpty(content: string): boolean {
  if (!content || !content.trim()) return true;
  try {
    const parsed = JSON.parse(content);
    if (!parsed?.content) return true;
    return !parsed.content.some((node: any) =>
      node.content?.some((c: any) => c.text?.trim())
    );
  } catch {
    return !content.trim();
  }
}

function CommentItem({
  comment,
  onReply,
  onDelete,
  currentUserId,
  depth = 0,
}: {
  comment: ProblemComment;
  onReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
  depth?: number;
}) {
  const isOwner = currentUserId && comment.user_id === currentUserId;
  const maxDepth = 3;
  const displayContent = extractTextContent(comment.content);

  return (
    <div className={cn("space-y-3", depth > 0 && "ml-8 pl-4 border-l border-border/50")}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.author?.avatar_url || ""} />
          <AvatarFallback className="text-xs">
            {comment.author?.full_name?.charAt(0)?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">
              {comment.author?.full_name || "Anonymous"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">
            {displayContent}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {depth < maxDepth && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onReply(comment.id)}
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(comment.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProblemCommentsSection({ problemId }: ProblemCommentsSectionProps) {
  const {
    comments,
    loading,
    submitting,
    addComment,
    deleteComment,
    isAuthenticated,
  } = useProblemComments(problemId);

  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const editorKeyRef = useRef(0);
  const replyEditorKeyRef = useRef(0);

  const handleSubmit = async () => {
    if (isContentEmpty(newComment)) return;
    if (!isAuthenticated) {
      toast.error("Please sign in to comment");
      return;
    }

    // Store the content as JSON for TipTap
    const result = await addComment(newComment);
    if (result) {
      setNewComment("");
      editorKeyRef.current += 1; // Force re-mount to clear editor
      toast.success("Comment added");
    } else {
      toast.error("Failed to add comment");
    }
  };

  const handleReply = async () => {
    if (isContentEmpty(replyContent) || !replyingTo) return;
    if (!isAuthenticated) {
      toast.error("Please sign in to reply");
      return;
    }

    const result = await addComment(replyContent, replyingTo);
    if (result) {
      setReplyContent("");
      setReplyingTo(null);
      replyEditorKeyRef.current += 1;
      toast.success("Reply added");
    } else {
      toast.error("Failed to add reply");
    }
  };

  const handleDelete = async (commentId: string) => {
    const success = await deleteComment(commentId);
    if (success) {
      toast.success("Comment deleted");
    } else {
      toast.error("Failed to delete comment");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comment input with LightEditor */}
      <div className="p-4 border-b border-border/50">
        <div className="space-y-3">
          <div className="rounded-lg border border-input bg-background overflow-hidden">
            <LightEditor
              key={editorKeyRef.current}
              value={newComment}
              onChange={setNewComment}
              placeholder={isAuthenticated ? "Share your thoughts..." : "Sign in to comment"}
              disabled={!isAuthenticated || submitting}
              minHeight="80px"
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isContentEmpty(newComment) || !isAuthenticated || submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Comment
            </Button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">Be the first to share your thoughts</p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={(parentId) => {
                  setReplyingTo(parentId);
                  setReplyContent("");
                  replyEditorKeyRef.current += 1;
                }}
                onDelete={handleDelete}
                currentUserId={isAuthenticated ? undefined : undefined}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Reply with LightEditor */}
      {replyingTo && (
        <div className="p-4 border-t border-border/50 bg-muted/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Replying to comment</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
              >
                Cancel
              </Button>
            </div>
            <div className="rounded-lg border border-input bg-background overflow-hidden">
              <LightEditor
                key={replyEditorKeyRef.current}
                value={replyContent}
                onChange={setReplyContent}
                placeholder="Write your reply..."
                disabled={submitting}
                minHeight="60px"
                autoFocus
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleReply}
                disabled={isContentEmpty(replyContent) || submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Reply className="h-4 w-4 mr-2" />
                )}
                Reply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
