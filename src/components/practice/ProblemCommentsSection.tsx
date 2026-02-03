import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Trash2, Reply, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useProblemComments, ProblemComment } from "@/hooks/useProblemComments";
import { toast } from "sonner";

interface ProblemCommentsSectionProps {
  problemId: string;
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
            {comment.content}
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
    commentCount,
    isAuthenticated,
  } = useProblemComments(problemId);

  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    if (!isAuthenticated) {
      toast.error("Please sign in to comment");
      return;
    }

    const result = await addComment(newComment);
    if (result) {
      setNewComment("");
      toast.success("Comment added");
    } else {
      toast.error("Failed to add comment");
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !replyingTo) return;
    if (!isAuthenticated) {
      toast.error("Please sign in to reply");
      return;
    }

    const result = await addComment(replyContent, replyingTo);
    if (result) {
      setReplyContent("");
      setReplyingTo(null);
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
      {/* Comment input */}
      <div className="p-4 border-b border-border/50">
        <div className="space-y-3">
          <Textarea
            placeholder={isAuthenticated ? "Share your thoughts..." : "Sign in to comment"}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] resize-none"
            disabled={!isAuthenticated || submitting}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || !isAuthenticated || submitting}
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
                }}
                onDelete={handleDelete}
                currentUserId={isAuthenticated ? undefined : undefined}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Reply modal/inline */}
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
            <Textarea
              placeholder="Write your reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[60px] resize-none"
              autoFocus
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleReply}
                disabled={!replyContent.trim() || submitting}
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
