import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Trash2, MessageSquare, AlertCircle, CheckCircle, XCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Comment {
  id: string;
  content: string;
  status: string;
  created_at: string;
  post_id: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
  posts: {
    title: string;
  };
}

const AdminComments = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
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
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id (full_name, email),
          posts:post_id (title)
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

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .update({ status: "approved" })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Comment approved" });
      fetchComments();
    } catch (error: any) {
      toast({ title: "Error approving comment", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Comment rejected" });
      fetchComments();
    } catch (error: any) {
      toast({ title: "Error rejecting comment", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Comment deleted" });
      fetchComments();
    } catch (error: any) {
      toast({ title: "Error deleting comment", description: error.message, variant: "destructive" });
    }
  };

  const filteredComments = comments.filter((comment) => {
    const matchesSearch = 
      comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.posts?.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = 
      activeTab === "all" ||
      comment.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: comments.length,
    pending: comments.filter(c => c.status === "pending").length,
    approved: comments.filter(c => c.status === "approved").length,
    rejected: comments.filter(c => c.status === "rejected").length,
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
          <p className="text-muted-foreground">Review, approve, or reject user comments on lessons</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Comments</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-orange-500">{stats.pending}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search comments by content, author, or post..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({stats.approved})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({stats.rejected})
            </TabsTrigger>
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
              <div className="grid gap-4">
                {filteredComments.map((comment) => (
                  <Card key={comment.id} className="border-primary/10">
                    <CardHeader>
                      <CardTitle className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                              {comment.profiles?.full_name?.charAt(0)?.toUpperCase() || comment.profiles?.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold">
                                {comment.profiles?.full_name || "Anonymous"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {comment.profiles?.email}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Commented on: <span className="font-medium">{comment.posts?.title}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(comment.created_at).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
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
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/30 p-4 rounded-lg mb-4">
                        <p className="whitespace-pre-wrap">{comment.content}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {comment.status !== "approved" && (
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove(comment.id)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <Check className="mr-1 h-4 w-4" /> Approve
                          </Button>
                        )}
                        {comment.status !== "rejected" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleReject(comment.id)}
                            className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                          >
                            <X className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDelete(comment.id)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
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
