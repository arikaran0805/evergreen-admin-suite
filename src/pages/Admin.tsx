import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Users, FileText, MessageSquare, Home, Calendar, Eye, Edit, Info, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RecentPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
  };
  courses: {
    slug: string;
  } | null;
}

interface PostStats {
  [postId: string]: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [postStats, setPostStats] = useState<PostStats>({});
  const [filterType, setFilterType] = useState<"posted" | "edited">("posted");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!loading && isAdmin) {
      fetchRecentPosts();
    }
  }, [filterType, loading, isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Access Denied",
          description: "Please login first",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) throw roleError;

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await fetchStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get total posts
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });

      // Get total comments
      const { count: commentsCount } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true });

      setStats({
        totalUsers: usersCount || 0,
        totalPosts: postsCount || 0,
        totalComments: commentsCount || 0,
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRecentPosts = async () => {
    try {
      const orderField = filterType === "posted" ? "created_at" : "updated_at";
      
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          slug,
          status,
          published_at,
          created_at,
          updated_at,
          profiles:author_id (full_name),
          courses:category_id (slug)
        `)
        .order(orderField, { ascending: false })
        .limit(7);

      if (postsError) throw postsError;
      setRecentPosts(postsData || []);
      
      // Fetch stats for each post
      if (postsData && postsData.length > 0) {
        await fetchPostStats(postsData.map(p => p.id));
      }
    } catch (error: any) {
      console.error("Error fetching recent posts:", error);
    }
  };

  const fetchPostStats = async (postIds: string[]) => {
    try {
      const statsMap: PostStats = {};
      
      // Initialize stats for all posts
      postIds.forEach(id => {
        statsMap[id] = { views: 0, likes: 0, comments: 0, shares: 0 };
      });

      // Fetch views counts
      const { data: viewsData } = await supabase
        .from("post_views")
        .select("post_id")
        .in("post_id", postIds);
      
      if (viewsData) {
        viewsData.forEach(view => {
          if (statsMap[view.post_id]) {
            statsMap[view.post_id].views++;
          }
        });
      }

      // Fetch likes counts
      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", postIds);
      
      if (likesData) {
        likesData.forEach(like => {
          if (statsMap[like.post_id]) {
            statsMap[like.post_id].likes++;
          }
        });
      }

      // Fetch comments counts
      const { data: commentsData } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);
      
      if (commentsData) {
        commentsData.forEach(comment => {
          if (statsMap[comment.post_id]) {
            statsMap[comment.post_id].comments++;
          }
        });
      }

      // Fetch shares counts
      const { data: sharesData } = await supabase
        .from("post_shares")
        .select("post_id")
        .in("post_id", postIds);
      
      if (sharesData) {
        sharesData.forEach(share => {
          if (statsMap[share.post_id]) {
            statsMap[share.post_id].shares++;
          }
        });
      }

      setPostStats(statsMap);
    } catch (error) {
      console.error("Error fetching post stats:", error);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center">Checking permissions...</div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your blog content and users</p>
        </div>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your blog content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link to="/admin/posts">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Manage Posts
              </Button>
            </Link>
            <Link to="/admin/categories">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Manage Courses
              </Button>
            </Link>
            <Link to="/admin/comments">
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                Manage Comments
              </Button>
            </Link>
            <Link to="/admin/users">
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
            </Link>
            <Link to="/admin/pages">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Manage Pages
              </Button>
            </Link>
            <Link to="/admin/monetization">
              <Button className="w-full justify-start" variant="outline">
                <DollarSign className="mr-2 h-4 w-4" />
                Monetization
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Posts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>Latest blog posts from your site</CardDescription>
            </div>
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as "posted" | "edited")} className="w-auto">
              <TabsList>
                <TabsTrigger value="posted">Recently Posted</TabsTrigger>
                <TabsTrigger value="edited">Recently Edited</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentPosts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No posts yet. Create your first post!</p>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-accent/5 transition-colors">
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="font-semibold text-foreground truncate mb-1">{post.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {filterType === "posted" 
                          ? format(new Date(post.created_at), "MMM d, yyyy 'at' h:mm a")
                          : format(new Date(post.updated_at), "MMM d, yyyy 'at' h:mm a")
                        }
                      </span>
                      {post.profiles?.full_name && (
                        <span>by {post.profiles.full_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={post.status === "published" ? "default" : "secondary"} className="shrink-0">
                      {post.status}
                    </Badge>
                    {post.courses?.slug ? (
                      <Link to={`/category/${post.courses.slug}?lesson=${post.slug}`} target="_blank">
                        <Button size="sm" variant="outline" className="gap-1">
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1" disabled title="No course assigned">
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    )}
                    <Link to={`/admin/posts/edit/${post.id}`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                    </Link>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" className="gap-1 px-2">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-3">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Views:</span>
                              <span className="font-medium">{postStats[post.id]?.views || 0}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Likes:</span>
                              <span className="font-medium">{postStats[post.id]?.likes || 0}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Comments:</span>
                              <span className="font-medium">{postStats[post.id]?.comments || 0}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Shares:</span>
                              <span className="font-medium">{postStats[post.id]?.shares || 0}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Last Updated:</span>
                              <span className="font-medium">{format(new Date(post.updated_at), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default Admin;
