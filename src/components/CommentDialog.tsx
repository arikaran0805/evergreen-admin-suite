import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, ThumbsUp, ThumbsDown, Reply, Pencil, Trash2, X, Check } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string | null;
  is_anonymous: boolean;
  display_name: string | null;
  parent_id?: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comments: Comment[];
  user: any;
  newComment: string;
  setNewComment: (value: string) => void;
  onSubmitComment: (e: React.FormEvent, isAnonymous: boolean, parentId?: string) => void;
  onEditComment?: (commentId: string, newContent: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  submitting: boolean;
}

// Get or create session ID for anonymous users
const getSessionId = () => {
  let sessionId = localStorage.getItem("comment_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("comment_session_id", sessionId);
  }
  return sessionId;
};

const CommentDialog = ({
  open,
  onOpenChange,
  comments,
  user,
  newComment,
  setNewComment,
  onSubmitComment,
  onEditComment,
  onDeleteComment,
  submitting,
}: CommentDialogProps) => {
  const [postAnonymously, setPostAnonymously] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyAnonymously, setReplyAnonymously] = useState(false);
  const [reactions, setReactions] = useState<Record<string, { likes: number; dislikes: number; userReaction: string | null }>>({});
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "most_liked">("newest");
  const { toast } = useToast();

  const sessionId = getSessionId();

  // Fetch reactions for all comments
  useEffect(() => {
    if (open && comments.length > 0) {
      fetchReactions();
    }
  }, [open, comments]);

  const fetchReactions = async () => {
    const commentIds = comments.map(c => c.id);
    if (commentIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from("comment_reactions")
        .select("comment_id, reaction_type, session_id")
        .in("comment_id", commentIds);

      if (error) throw error;

      const reactionMap: Record<string, { likes: number; dislikes: number; userReaction: string | null }> = {};
      
      commentIds.forEach(id => {
        reactionMap[id] = { likes: 0, dislikes: 0, userReaction: null };
      });

      data?.forEach(r => {
        if (r.reaction_type === "like") {
          reactionMap[r.comment_id].likes++;
        } else {
          reactionMap[r.comment_id].dislikes++;
        }
        if (r.session_id === sessionId) {
          reactionMap[r.comment_id].userReaction = r.reaction_type;
        }
      });

      setReactions(reactionMap);
    } catch (error) {
      console.error("Error fetching reactions:", error);
    }
  };

  const handleReaction = async (commentId: string, type: "like" | "dislike") => {
    const currentReaction = reactions[commentId]?.userReaction;

    try {
      if (currentReaction === type) {
        // Remove reaction
        await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("session_id", sessionId);
      } else if (currentReaction) {
        // Update reaction
        await supabase
          .from("comment_reactions")
          .update({ reaction_type: type })
          .eq("comment_id", commentId)
          .eq("session_id", sessionId);
      } else {
        // Insert new reaction
        await supabase
          .from("comment_reactions")
          .insert({
            comment_id: commentId,
            session_id: sessionId,
            user_id: user?.id || null,
            reaction_type: type,
          });
      }

      fetchReactions();
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  const getDisplayName = (comment: Comment) => {
    if (comment.is_anonymous || !comment.user_id) {
      return comment.display_name || "unknown_ant";
    }
    return comment.profiles?.full_name || "unknown_ant";
  };

  const getAvatarFallback = (comment: Comment) => {
    const name = getDisplayName(comment);
    return name.charAt(0).toUpperCase();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitComment(e, postAnonymously);
  };

  const handleReplySubmit = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    
    // Temporarily set newComment to reply content
    const originalComment = newComment;
    setNewComment(replyContent);
    onSubmitComment(e, replyAnonymously, parentId);
    setNewComment(originalComment);
    setReplyContent("");
    setReplyingTo(null);
    setReplyAnonymously(false);
  };

  const canEditOrDelete = (comment: Comment) => {
    return user && comment.user_id === user.id;
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!onEditComment || !editContent.trim()) return;
    setIsUpdating(true);
    try {
      await onEditComment(commentId, editContent.trim());
      setEditingId(null);
      setEditContent("");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!onDeleteComment) return;
    if (window.confirm("Are you sure you want to delete this comment?")) {
      await onDeleteComment(commentId);
    }
  };

  // Organize and sort comments into threads
  const topLevelComments = useMemo(() => {
    const filtered = comments.filter(c => !c.parent_id);
    
    return [...filtered].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        // most_liked
        const aLikes = reactions[a.id]?.likes || 0;
        const bLikes = reactions[b.id]?.likes || 0;
        return bLikes - aLikes;
      }
    });
  }, [comments, sortBy, reactions]);

  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <div key={comment.id} className={`p-4 bg-muted/30 rounded-lg ${isReply ? "ml-8 mt-2" : ""}`}>
      <div className="flex gap-4">
        <Avatar className="h-8 w-8">
          {!comment.is_anonymous && comment.user_id && comment.profiles?.avatar_url ? (
            <AvatarImage src={comment.profiles.avatar_url} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {getAvatarFallback(comment)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {getDisplayName(comment)}
              </span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(comment.created_at), "MMM d, yyyy")}
              </span>
            </div>
            
            {canEditOrDelete(comment) && editingId !== comment.id && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                  onClick={() => handleStartEdit(comment)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(comment.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          
          {editingId === comment.id ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="border-primary/20 focus:border-primary"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSaveEdit(comment.id)}
                  disabled={isUpdating || !editContent.trim()}
                  className="h-8"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {isUpdating ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="h-8"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-foreground mb-3">{comment.content}</p>
          )}
          
          {editingId !== comment.id && (
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 ${reactions[comment.id]?.userReaction === "like" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                onClick={() => handleReaction(comment.id, "like")}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                <span className="text-xs">{reactions[comment.id]?.likes || 0}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 ${reactions[comment.id]?.userReaction === "dislike" ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
                onClick={() => handleReaction(comment.id, "dislike")}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                <span className="text-xs">{reactions[comment.id]?.dislikes || 0}</span>
              </Button>
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-primary"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                >
                  <Reply className="h-4 w-4 mr-1" />
                  <span className="text-xs">Reply</span>
                </Button>
              )}
            </div>
          )}

          {/* Reply form */}
          {replyingTo === comment.id && (
            <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="mt-3 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={2}
                className="border-primary/20 focus:border-primary"
              />
              {user && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`reply-anon-${comment.id}`}
                    checked={replyAnonymously}
                    onCheckedChange={(checked) => setReplyAnonymously(checked as boolean)}
                  />
                  <Label htmlFor={`reply-anon-${comment.id}`} className="text-xs text-muted-foreground cursor-pointer">
                    Reply anonymously
                  </Label>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={submitting || !replyContent.trim()}>
                  {submitting ? "Posting..." : "Post Reply"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Comments ({comments.length})
          </DialogTitle>
          <DialogDescription>
            Share your thoughts and join the discussion
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Comment Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                required
                className="border-primary/20 focus:border-primary"
              />
              
              {user && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anonymous"
                    checked={postAnonymously}
                    onCheckedChange={(checked) => setPostAnonymously(checked as boolean)}
                  />
                  <Label htmlFor="anonymous" className="text-sm text-muted-foreground cursor-pointer">
                    Post anonymously (hide my name)
                  </Label>
                </div>
              )}
              
              {!user && (
                <p className="text-sm text-muted-foreground">
                  Posting as <span className="font-medium">unknown_ant</span>
                </p>
              )}
              
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary/90"
              >
                {submitting ? "Submitting..." : "Post Comment"}
              </Button>
            </form>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {/* Sort Options */}
            {comments.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sort by</span>
                <Select value={sortBy} onValueChange={(value: "newest" | "oldest" | "most_liked") => setSortBy(value)}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="most_liked">Most Liked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {topLevelComments.map((comment) => (
              <div key={comment.id}>
                {renderComment(comment)}
                {/* Render replies */}
                {getReplies(comment.id).map((reply) => renderComment(reply, true))}
              </div>
            ))}

            {comments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentDialog;
