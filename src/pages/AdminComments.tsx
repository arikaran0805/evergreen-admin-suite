import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Trash2, MessageSquare, Search, User, UserX, Reply, ThumbsUp, ThumbsDown, 
  ExternalLink, Send, Shield
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Comment {
  id: string;
  content: string;
  status: string;
  created_at: string;
  post_id: string;
  user_id: string | null;
  is_anonymous: boolean;
  display_name: string | null;
  parent_id: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
  posts: {
    title: string;
    slug: string;
  } | null;
}

interface CommentReaction {
  comment_id: string;
  reaction_type: string;
  count: number;
}

const AdminComments = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Map<string, { likes: number; dislikes: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setCurrentUserId(session.user.id);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }

    fetchComments();
    fetchReactions();
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id (full_name, email),
          posts:post_id (title, slug)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      toast({ title: "Error fetching comments", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from("comment_reactions")
        .select("comment_id, reaction_type");

      if (error) throw error;

      // Aggregate reactions by comment
      const reactionMap = new Map<string, { likes: number; dislikes: number }>();
      data?.forEach((reaction) => {
        const current = reactionMap.get(reaction.comment_id) || { likes: 0, dislikes: 0 };
        if (reaction.reaction_type === "like") {
          current.likes++;
        } else if (reaction.reaction_type === "dislike") {
          current.dislikes++;
        }
        reactionMap.set(reaction.comment_id, current);
      });
      setReactions(reactionMap);
    } catch (error: any) {
      console.error("Error fetching reactions:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this comment? This will also delete all replies.")) return;
    try {
      // Delete replies first
      await supabase.from("comments").delete().eq("parent_id", id);
      // Delete the comment
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Comment deleted" });
      fetchComments();
    } catch (error: any) {
      toast({ title: "Error deleting comment", description: error.message, variant: "destructive" });
    }
  };

  const handleSubmitReply = async (parentComment: Comment) => {
    if (!replyContent.trim() || !currentUserId) return;
    
    setSubmittingReply(true);
    try {
      const { error } = await supabase.from("comments").insert({
        content: replyContent.trim(),
        post_id: parentComment.post_id,
        parent_id: parentComment.id,
        user_id: currentUserId,
        is_anonymous: false,
        display_name: "Admin",
        status: "approved" // Admin replies are auto-approved
      });

      if (error) throw error;
      
      toast({ title: "Reply posted successfully" });
      setReplyContent("");
      setReplyingTo(null);
      fetchComments();
    } catch (error: any) {
      toast({ title: "Error posting reply", description: error.message, variant: "destructive" });
    } finally {
      setSubmittingReply(false);
    }
  };

  // Get replies for a comment
  const getReplies = (parentId: string) => {
    return comments.filter(c => c.parent_id === parentId);
  };

  // Filter to only show top-level comments (not replies)
  const topLevelComments = comments.filter(c => !c.parent_id);

  const filteredComments = topLevelComments.filter((comment) => {
    const matchesSearch = 
      comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.posts?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = false;
    if (activeTab === "all") {
      matchesTab = true;
    } else if (activeTab === "anonymous") {
      matchesTab = comment.is_anonymous;
    } else if (activeTab === "replies") {
      matchesTab = getReplies(comment.id).length > 0;
    } else {
      matchesTab = comment.status === activeTab;
    }
    
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: comments.length,
    topLevel: topLevelComments.length,
    replies: comments.filter(c => c.parent_id).length,
    anonymous: comments.filter(c => c.is_anonymous).length,
    withReplies: topLevelComments.filter(c => getReplies(c.id).length > 0).length,
  };

  const getAuthorDisplay = (comment: Comment) => {
    if (comment.is_anonymous || !comment.user_id) {
      return {
        name: comment.display_name || "unknown_ant",
        isAnonymous: true,
        email: null
      };
    }
    return {
      name: comment.profiles?.full_name || "User",
      isAnonymous: false,
      email: comment.profiles?.email
    };
  };

  const CommentCard = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const author = getAuthorDisplay(comment);
    const commentReactions = reactions.get(comment.id) || { likes: 0, dislikes: 0 };
    const replies = getReplies(comment.id);

    return (
      <div className={`${isReply ? 'ml-8 border-l-2 border-primary/20 pl-4' : ''}`}>
        <Card className={`border-primary/10 ${isReply ? 'bg-muted/20' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 space-y-2">
                {/* Author Info */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    author.isAnonymous 
                      ? 'bg-orange-500/20 text-orange-600' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {author.isAnonymous ? (
                      <UserX className="h-5 w-5" />
                    ) : (
                      author.name?.charAt(0)?.toUpperCase() || <User className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{author.name}</p>
                      {author.isAnonymous && (
                        <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-600">
                          Anonymous
                        </Badge>
                      )}
                      {isReply && (
                        <Badge variant="outline" className="text-xs">
                          <Reply className="h-3 w-3 mr-1" /> Reply
                        </Badge>
                      )}
                    </div>
                    {author.email && (
                      <p className="text-xs text-muted-foreground">{author.email}</p>
                    )}
                  </div>
                </div>

                {/* Post Reference */}
                {comment.posts && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>On:</span>
                    <span className="font-medium text-foreground">{comment.posts.title}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2"
                      onClick={() => window.open(`/course/${comment.posts?.slug}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Timestamp */}
                <p className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Status Badge */}
              <Badge 
                variant={
                  comment.status === "approved" ? "default" : 
                  comment.status === "pending" ? "secondary" : 
                  "destructive"
                }
                className={
                  comment.status === "approved" ? "bg-green-500 hover:bg-green-600" :
                  comment.status === "pending" ? "bg-orange-500 hover:bg-orange-600" :
                  ""
                }
              >
                {comment.status.charAt(0).toUpperCase() + comment.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Comment Content */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
            </div>

            {/* Reactions */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                <span>{commentReactions.likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="h-4 w-4 text-red-500" />
                <span>{commentReactions.dislikes}</span>
              </div>
              {!isReply && replies.length > 0 && (
                <div className="flex items-center gap-1">
                  <Reply className="h-4 w-4 text-primary" />
                  <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap pt-2 border-t border-border/50">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="border-primary text-primary hover:bg-primary/10"
              >
                <Reply className="mr-1 h-4 w-4" /> Reply
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => handleDelete(comment.id)}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </div>

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Reply as Admin</span>
                </div>
                <Textarea
                  placeholder="Write your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment)}
                    disabled={!replyContent.trim() || submittingReply}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="mr-1 h-4 w-4" />
                    {submittingReply ? "Posting..." : "Post Reply"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Replies */}
        {!isReply && replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {replies.map((reply) => (
              <CommentCard key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading comments...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Comments Management</h1>
          <p className="text-muted-foreground">Review, moderate, and manage user comments including anonymous posts and replies</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Comments</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Top-level</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.topLevel}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Replies</p>
                  <p className="text-2xl font-bold text-purple-500">{stats.replies}</p>
                </div>
                <Reply className="h-8 w-8 text-purple-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Anonymous</p>
                  <p className="text-2xl font-bold text-orange-500">{stats.anonymous}</p>
                </div>
                <UserX className="h-8 w-8 text-orange-500/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search comments by content, author name, email, or post title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All ({stats.topLevel})</TabsTrigger>
            <TabsTrigger value="anonymous">Anonymous ({stats.anonymous})</TabsTrigger>
            <TabsTrigger value="replies">With Replies ({stats.withReplies})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredComments.length === 0 ? (
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  {searchQuery 
                    ? "No comments found matching your search." 
                    : `No ${activeTab === "all" ? "" : activeTab} comments yet.`}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {filteredComments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminComments;
