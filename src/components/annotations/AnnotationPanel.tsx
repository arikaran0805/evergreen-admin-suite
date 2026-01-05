import { useState } from "react";
import { format } from "date-fns";
import { PostAnnotation, AnnotationReply } from "@/hooks/usePostAnnotations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  MessageSquarePlus, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Reply, 
  ChevronDown, 
  ChevronRight,
  Lightbulb,
  Heart,
  BookOpen,
  Sparkles,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AnnotationPanelProps {
  annotations: PostAnnotation[];
  loading: boolean;
  isAdmin: boolean;
  isModerator?: boolean;
  userId?: string;
  onAddAnnotation: (
    selectionStart: number,
    selectionEnd: number,
    selectedText: string,
    comment: string,
    annotationType?: "paragraph" | "code" | "conversation"
  ) => void;
  onUpdateStatus: (annotationId: string, status: "open" | "resolved" | "dismissed") => void;
  onDelete: (annotationId: string) => void;
  onAddReply: (annotationId: string, content: string) => void;
  onDeleteReply: (replyId: string) => void;
  selectedText?: { 
    start: number; 
    end: number; 
    text: string;
    type?: "paragraph" | "code" | "conversation";
    bubbleIndex?: number;
  } | null;
  onClearSelection?: () => void;
  onAnnotationClick?: (annotation: PostAnnotation) => void;
  showAnnotationsInline?: boolean;
  onToggleInlineAnnotations?: (show: boolean) => void;
}

const AnnotationPanel = ({
  annotations,
  loading,
  isAdmin,
  isModerator = false,
  userId,
  onAddAnnotation,
  onUpdateStatus,
  onDelete,
  onAddReply,
  onDeleteReply,
  selectedText,
  onClearSelection,
  onAnnotationClick,
  showAnnotationsInline = true,
  onToggleInlineAnnotations,
}: AnnotationPanelProps) => {
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"needs-attention" | "resolved">("needs-attention");

  // Check if moderator can annotate the selected type
  const canAnnotateSelection = () => {
    if (isAdmin) return true;
    if (!isModerator) return false;
    if (!selectedText) return false;
    
    const type = selectedText.type || "paragraph";
    return type === "paragraph" || type === "code";
  };

  const handleAddAnnotation = () => {
    if (!selectedText || !newComment.trim()) return;
    if (!canAnnotateSelection()) return;
    
    onAddAnnotation(
      selectedText.start,
      selectedText.end,
      selectedText.text,
      newComment.trim(),
      selectedText.type
    );
    setNewComment("");
    onClearSelection?.();
  };

  const openAnnotations = annotations.filter(a => a.status === "open");
  const resolvedAnnotations = annotations.filter(a => a.status !== "open");
  const totalOpen = openAnnotations.length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "gap-2 border-2 transition-all",
            totalOpen > 0 
              ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40" 
              : "hover:border-primary/50"
          )}
        >
          <Lightbulb className={cn(
            "h-4 w-4",
            totalOpen > 0 ? "text-amber-500" : ""
          )} />
          <span className="font-medium">Teaching Notes</span>
          {totalOpen > 0 && (
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white ml-1">
              {totalOpen}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[460px] sm:w-[520px] flex flex-col p-0 gap-0">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-br from-primary/5 to-transparent">
          <SheetTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-lg">Teaching Notes</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                Guidance to help improve this content
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Toggle inline annotations */}
        {onToggleInlineAnnotations && (
          <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b">
            <Label htmlFor="inline-annotations" className="text-sm cursor-pointer flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Highlight notes in content
            </Label>
            <Switch
              id="inline-annotations"
              checked={showAnnotationsInline}
              onCheckedChange={onToggleInlineAnnotations}
            />
          </div>
        )}

        {/* Add annotation section */}
        <AnimatePresence>
          {selectedText && (isAdmin || (isModerator && canAnnotateSelection())) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b"
            >
              <div className="p-6 bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-950/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <MessageSquarePlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Share your teaching insight
                  </p>
                </div>
                
                {/* Warning for moderators on conversation */}
                {isModerator && !isAdmin && selectedText.type === "conversation" && (
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm mb-3 text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Only senior mentors can add notes to conversation sections.</span>
                  </div>
                )}
                
                {/* Selected text preview */}
                <div className="p-3 bg-white dark:bg-card border border-emerald-200 dark:border-emerald-800 rounded-lg mb-3">
                  <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">
                    Selected text
                  </p>
                  <p className="text-sm italic text-foreground/80 line-clamp-3">
                    "{selectedText.text}"
                  </p>
                </div>
                
                <Textarea
                  placeholder="What teaching guidance would you like to share? (e.g., 'Consider adding a real-world example here for beginners')"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mb-3 bg-white dark:bg-card border-emerald-200 dark:border-emerald-800 focus:border-emerald-400 min-h-[80px]"
                  rows={3}
                  disabled={!canAnnotateSelection()}
                />
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddAnnotation} 
                    disabled={!newComment.trim() || !canAnnotateSelection()}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Send className="h-4 w-4" />
                    Add Note
                  </Button>
                  <Button variant="ghost" onClick={onClearSelection}>
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex border-b px-6">
          <button
            onClick={() => setActiveTab("needs-attention")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "needs-attention"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              openAnnotations.length > 0 ? "bg-amber-500 animate-pulse" : "bg-amber-300"
            )} />
            Needs Attention
            {openAnnotations.length > 0 && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                {openAnnotations.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("resolved")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "resolved"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            Addressed
            {resolvedAnnotations.length > 0 && (
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                {resolvedAnnotations.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-xl animate-pulse bg-muted/30">
                  <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {activeTab === "needs-attention" ? (
                openAnnotations.length === 0 ? (
                  <EmptyState type="open" isAdmin={isAdmin} isModerator={isModerator} />
                ) : (
                  openAnnotations.map((annotation) => (
                    <AnnotationCard
                      key={annotation.id}
                      annotation={annotation}
                      isAdmin={isAdmin}
                      isModerator={isModerator}
                      userId={userId}
                      onUpdateStatus={onUpdateStatus}
                      onDelete={onDelete}
                      onAddReply={onAddReply}
                      onDeleteReply={onDeleteReply}
                      onClick={() => onAnnotationClick?.(annotation)}
                    />
                  ))
                )
              ) : (
                resolvedAnnotations.length === 0 ? (
                  <EmptyState type="resolved" isAdmin={isAdmin} isModerator={isModerator} />
                ) : (
                  resolvedAnnotations.map((annotation) => (
                    <AnnotationCard
                      key={annotation.id}
                      annotation={annotation}
                      isAdmin={isAdmin}
                      isModerator={isModerator}
                      userId={userId}
                      onUpdateStatus={onUpdateStatus}
                      onDelete={onDelete}
                      onAddReply={onAddReply}
                      onDeleteReply={onDeleteReply}
                      onClick={() => onAnnotationClick?.(annotation)}
                    />
                  ))
                )
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

const EmptyState = ({ type, isAdmin, isModerator }: { type: "open" | "resolved"; isAdmin: boolean; isModerator: boolean }) => (
  <div className="text-center py-12 px-6">
    {type === "open" ? (
      <>
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <Heart className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="font-medium text-lg mb-2">All caught up!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          There are no notes that need attention right now.
        </p>
        {(isAdmin || isModerator) && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            💡 Select any text in the content to share teaching guidance
          </p>
        )}
      </>
    ) : (
      <>
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-2">No addressed notes yet</h3>
        <p className="text-sm text-muted-foreground">
          Notes that have been addressed will appear here for reference.
        </p>
      </>
    )}
  </div>
);

interface AnnotationCardProps {
  annotation: PostAnnotation;
  isAdmin: boolean;
  isModerator: boolean;
  userId?: string;
  onUpdateStatus: (id: string, status: "open" | "resolved" | "dismissed") => void;
  onDelete: (id: string) => void;
  onAddReply: (annotationId: string, content: string) => void;
  onDeleteReply: (replyId: string) => void;
  onClick?: () => void;
}

const AnnotationCard = ({
  annotation,
  isAdmin,
  isModerator,
  userId,
  onUpdateStatus,
  onDelete,
  onAddReply,
  onDeleteReply,
  onClick,
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
  const isOwnAnnotation = annotation.author_id === userId;
  const isOpen = annotation.status === "open";
  
  const canResolve = isAdmin;
  const canDelete = isAdmin;
  const canReply = isAdmin || isModerator;

  const authorName = annotation.author_profile?.full_name || annotation.author_profile?.email?.split("@")[0] || "Mentor";
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border-2 transition-all hover:shadow-lg cursor-pointer overflow-hidden",
        isOpen 
          ? "border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20" 
          : "border-muted bg-muted/20 opacity-75 hover:opacity-100"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className={cn(
              "text-xs font-medium",
              isOpen 
                ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300" 
                : "bg-muted text-muted-foreground"
            )}>
              {authorInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{authorName}</span>
              {isOwnAnnotation && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">you</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {format(new Date(annotation.created_at), "MMM d")}
              </span>
            </div>
            {/* Status indicator for open */}
            {isOpen && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Waiting for response
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Selected text */}
      <div className="px-4 pb-3">
        <div className={cn(
          "p-3 rounded-lg border-l-4",
          isOpen 
            ? "bg-amber-100/50 dark:bg-amber-900/20 border-amber-400" 
            : "bg-muted/50 border-muted-foreground/30"
        )}>
          <p className="text-xs text-muted-foreground mb-1">Regarding this section:</p>
          <p className="text-sm italic line-clamp-2">"{annotation.selected_text}"</p>
        </div>
      </div>

      {/* Comment */}
      <div className="px-4 pb-4">
        <p className="text-sm leading-relaxed">{annotation.comment}</p>
      </div>

      {/* Replies section */}
      {replyCount > 0 && (
        <div className="border-t border-dashed px-4 py-3">
          <Collapsible open={repliesExpanded} onOpenChange={setRepliesExpanded}>
            <CollapsibleTrigger asChild>
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                onClick={(e) => e.stopPropagation()}
              >
                {repliesExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>{replyCount} {replyCount === 1 ? "response" : "responses"}</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
              {annotation.replies?.map((reply) => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  isAdmin={isAdmin}
                  userId={userId}
                  onDelete={onDeleteReply}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Reply input */}
      <AnimatePresence>
        {showReplyInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-muted/30 space-y-3">
              <Textarea
                placeholder="Share your thoughts..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={2}
                className="text-sm bg-background"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddReply} disabled={!replyContent.trim()} className="gap-2">
                  <Send className="h-3 w-3" />
                  Send
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setShowReplyInput(false);
                  setReplyContent("");
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div 
        className="flex items-center gap-1 px-4 py-3 border-t bg-muted/20"
        onClick={(e) => e.stopPropagation()}
      >
        {canReply && !showReplyInput && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowReplyInput(true)}
            className="gap-1.5 h-8 text-xs"
          >
            <Reply className="h-3.5 w-3.5" />
            Respond
          </Button>
        )}
        
        {canResolve && isOpen && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onUpdateStatus(annotation.id, "resolved")}
            className="gap-1.5 h-8 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Addressed
          </Button>
        )}
        
        {canResolve && !isOpen && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onUpdateStatus(annotation.id, "open")}
            className="gap-1.5 h-8 text-xs"
          >
            Reopen
          </Button>
        )}
        
        {canDelete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(annotation.id)}
            className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive ml-auto"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};

interface ReplyCardProps {
  reply: AnnotationReply;
  isAdmin: boolean;
  userId?: string;
  onDelete: (replyId: string) => void;
}

const ReplyCard = ({ reply, isAdmin, userId, onDelete }: ReplyCardProps) => {
  const isOwnReply = reply.author_id === userId;
  const authorName = reply.author_profile?.full_name || reply.author_profile?.email?.split("@")[0] || "Team member";
  const authorInitials = authorName.slice(0, 2).toUpperCase();
  
  return (
    <div className="flex gap-3 pl-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
          {authorInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{authorName}</span>
          {isOwnReply && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">you</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {format(new Date(reply.created_at), "MMM d")}
          </span>
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(reply.id)}
              className="h-5 w-5 p-0 ml-auto text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <p className="text-sm text-foreground/90">{reply.content}</p>
      </div>
    </div>
  );
};

export default AnnotationPanel;