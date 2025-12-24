import { useState } from "react";
import { format } from "date-fns";
import { PostAnnotation, AnnotationReply } from "@/hooks/usePostAnnotations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MessageSquare, CheckCircle, XCircle, Trash2, Plus, Reply, ChevronDown, ChevronRight } from "lucide-react";

interface AnnotationPanelProps {
  annotations: PostAnnotation[];
  loading: boolean;
  isAdmin: boolean;
  onAddAnnotation: (
    selectionStart: number,
    selectionEnd: number,
    selectedText: string,
    comment: string
  ) => void;
  onUpdateStatus: (annotationId: string, status: "open" | "resolved" | "dismissed") => void;
  onDelete: (annotationId: string) => void;
  onAddReply: (annotationId: string, content: string) => void;
  onDeleteReply: (replyId: string) => void;
  selectedText?: { start: number; end: number; text: string } | null;
  onClearSelection?: () => void;
}

const AnnotationPanel = ({
  annotations,
  loading,
  isAdmin,
  onAddAnnotation,
  onUpdateStatus,
  onDelete,
  onAddReply,
  onDeleteReply,
  selectedText,
  onClearSelection,
}: AnnotationPanelProps) => {
  const [newComment, setNewComment] = useState("");
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);

  const handleAddAnnotation = () => {
    if (!selectedText || !newComment.trim()) return;
    
    onAddAnnotation(
      selectedText.start,
      selectedText.end,
      selectedText.text,
      newComment.trim()
    );
    setNewComment("");
    setAddPopoverOpen(false);
    onClearSelection?.();
  };

  const openAnnotations = annotations.filter(a => a.status === "open");
  const resolvedAnnotations = annotations.filter(a => a.status !== "open");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "resolved":
        return "bg-green-500/10 text-green-600 border-green-500/30";
      case "dismissed":
        return "bg-gray-500/10 text-gray-600 border-gray-500/30";
      default:
        return "";
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Annotations
          {openAnnotations.length > 0 && (
            <Badge variant="destructive" className="ml-1">
              {openAnnotations.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Annotations & Feedback</SheetTitle>
          <SheetDescription>
            Review comments and suggestions on this post
          </SheetDescription>
        </SheetHeader>

        {/* Add annotation section */}
        {isAdmin && selectedText && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-2">Add comment to selection:</p>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-sm mb-3 line-clamp-2">
              "{selectedText.text}"
            </div>
            <Textarea
              placeholder="Enter your feedback or suggestion..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-2"
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddAnnotation} disabled={!newComment.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Comment
              </Button>
              <Button size="sm" variant="outline" onClick={onClearSelection}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-250px)] mt-4 pr-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-lg animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : annotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No annotations yet</p>
              {isAdmin && (
                <p className="text-sm mt-2">
                  Select text in the editor to add a comment
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Open annotations */}
              {openAnnotations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Open ({openAnnotations.length})
                  </h4>
                  <div className="space-y-3">
                    {openAnnotations.map((annotation) => (
                      <AnnotationCard
                        key={annotation.id}
                        annotation={annotation}
                        isAdmin={isAdmin}
                        onUpdateStatus={onUpdateStatus}
                        onDelete={onDelete}
                        onAddReply={onAddReply}
                        onDeleteReply={onDeleteReply}
                        getStatusColor={getStatusColor}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved/dismissed annotations */}
              {resolvedAnnotations.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Resolved ({resolvedAnnotations.length})
                  </h4>
                  <div className="space-y-3 opacity-60">
                    {resolvedAnnotations.map((annotation) => (
                      <AnnotationCard
                        key={annotation.id}
                        annotation={annotation}
                        isAdmin={isAdmin}
                        onUpdateStatus={onUpdateStatus}
                        onDelete={onDelete}
                        onAddReply={onAddReply}
                        onDeleteReply={onDeleteReply}
                        getStatusColor={getStatusColor}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

interface AnnotationCardProps {
  annotation: PostAnnotation;
  isAdmin: boolean;
  onUpdateStatus: (id: string, status: "open" | "resolved" | "dismissed") => void;
  onDelete: (id: string) => void;
  onAddReply: (annotationId: string, content: string) => void;
  onDeleteReply: (replyId: string) => void;
  getStatusColor: (status: string) => string;
}

const AnnotationCard = ({
  annotation,
  isAdmin,
  onUpdateStatus,
  onDelete,
  onAddReply,
  onDeleteReply,
  getStatusColor,
}: AnnotationCardProps) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [repliesExpanded, setRepliesExpanded] = useState(true);

  const handleAddReply = () => {
    if (!replyContent.trim()) return;
    onAddReply(annotation.id, replyContent.trim());
    setReplyContent("");
    setShowReplyInput(false);
  };

  const replyCount = annotation.replies?.length || 0;

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <Badge className={getStatusColor(annotation.status)}>
          {annotation.status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {format(new Date(annotation.created_at), "MMM d, h:mm a")}
        </span>
      </div>

      {/* Selected text highlight */}
      <div className="p-2 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 rounded text-sm mb-3">
        "{annotation.selected_text}"
      </div>

      {/* Comment */}
      <p className="text-sm mb-3">{annotation.comment}</p>

      <div className="text-xs text-muted-foreground mb-3">
        By: {annotation.author_profile?.full_name || annotation.author_profile?.email || "Admin"}
      </div>

      {/* Replies section */}
      {replyCount > 0 && (
        <Collapsible open={repliesExpanded} onOpenChange={setRepliesExpanded} className="mb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto text-muted-foreground hover:text-foreground">
              {repliesExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span className="text-xs">{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {annotation.replies?.map((reply) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                isAdmin={isAdmin}
                onDelete={onDeleteReply}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Reply input */}
      {showReplyInput && (
        <div className="mb-3 p-3 bg-muted/50 rounded-lg space-y-2">
          <Textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddReply} disabled={!replyContent.trim()}>
              Reply
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              setShowReplyInput(false);
              setReplyContent("");
            }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {!showReplyInput && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowReplyInput(true)}
            className="gap-1"
          >
            <Reply className="h-3 w-3" />
            Reply
          </Button>
        )}
        {annotation.status === "open" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(annotation.id, "resolved")}
              className="gap-1"
            >
              <CheckCircle className="h-3 w-3" />
              Resolve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(annotation.id, "dismissed")}
              className="gap-1"
            >
              <XCircle className="h-3 w-3" />
              Dismiss
            </Button>
          </>
        )}
        {annotation.status !== "open" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateStatus(annotation.id, "open")}
          >
            Reopen
          </Button>
        )}
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(annotation.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

interface ReplyCardProps {
  reply: AnnotationReply;
  isAdmin: boolean;
  onDelete: (replyId: string) => void;
}

const ReplyCard = ({ reply, isAdmin, onDelete }: ReplyCardProps) => {
  return (
    <div className="pl-3 border-l-2 border-muted-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm">{reply.content}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {reply.author_profile?.full_name || reply.author_profile?.email || "User"}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(reply.created_at), "MMM d, h:mm a")}
            </span>
          </div>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(reply.id)}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default AnnotationPanel;
