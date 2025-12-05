import { useState } from "react";
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
import { MessageSquare, ThumbsUp, ThumbsDown, Reply, User } from "lucide-react";
import { format } from "date-fns";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string | null;
  is_anonymous: boolean;
  display_name: string | null;
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
  onSubmitComment: (e: React.FormEvent, isAnonymous: boolean) => void;
  submitting: boolean;
}

const CommentDialog = ({
  open,
  onOpenChange,
  comments,
  user,
  newComment,
  setNewComment,
  onSubmitComment,
  submitting,
}: CommentDialogProps) => {
  const [postAnonymously, setPostAnonymously] = useState(false);

  const getDisplayName = (comment: Comment) => {
    // If user chose to be anonymous or there's no user_id
    if (comment.is_anonymous || !comment.user_id) {
      return comment.display_name || "unknown_ant";
    }
    // If logged in user with profile
    return comment.profiles?.full_name || "unknown_ant";
  };

  const getAvatarFallback = (comment: Comment) => {
    const name = getDisplayName(comment);
    if (name === "unknown_ant") {
      return "🐜";
    }
    return name.charAt(0).toUpperCase();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitComment(e, postAnonymously);
  };

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
          {/* Comment Form - Available to everyone */}
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
              
              {/* Anonymous option for logged-in users */}
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
                  Posting as <span className="font-medium">unknown_ant</span> 🐜
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
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 bg-muted/30 rounded-lg">
                <div className="flex gap-4">
                  <Avatar>
                    {!comment.is_anonymous && comment.user_id && comment.profiles?.avatar_url ? (
                      <AvatarImage src={comment.profiles.avatar_url} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getAvatarFallback(comment)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold flex items-center gap-1">
                        {getDisplayName(comment)}
                        {(comment.is_anonymous || !comment.user_id) && (
                          <span className="text-base">🐜</span>
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(comment.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="text-foreground mb-3">{comment.content}</p>
                    
                    {/* Comment Actions */}
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-primary"
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        <span className="text-xs">Like</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-primary"
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        <span className="text-xs">Dislike</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-primary"
                      >
                        <Reply className="h-4 w-4 mr-1" />
                        <span className="text-xs">Reply</span>
                      </Button>
                    </div>
                  </div>
                </div>
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
