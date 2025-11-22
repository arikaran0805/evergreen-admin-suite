import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  if (loading) return <AdminLayout><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Comments Management</h1>

        <div className="grid gap-4">
          {comments.map((comment) => (
            <Card key={comment.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      By {comment.profiles?.full_name || comment.profiles?.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      On: {comment.posts?.title}
                    </p>
                  </div>
                  <Badge variant={comment.status === "approved" ? "default" : comment.status === "pending" ? "secondary" : "destructive"}>
                    {comment.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{comment.content}</p>
                <div className="flex gap-2">
                  {comment.status !== "approved" && (
                    <Button size="sm" onClick={() => handleApprove(comment.id)}>
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                  )}
                  {comment.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => handleReject(comment.id)}>
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(comment.id)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(comment.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminComments;
