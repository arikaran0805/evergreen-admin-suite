import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Eye, MousePointerClick } from "lucide-react";

interface AnalyticsStats {
  totalViews: number;
  totalUsers: number;
  totalSessions: number;
  avgViewsPerSession: number;
}

interface PageView {
  page_path: string;
  views: number;
}

interface TrafficSource {
  name: string;
  value: number;
}

interface DailyView {
  date: string;
  views: number;
}

interface TopPost {
  title: string;
  views: number;
}

const COLORS = ['hsl(142, 70%, 45%)', 'hsl(142, 70%, 65%)', 'hsl(160, 60%, 50%)', 'hsl(142, 45%, 70%)', 'hsl(142, 30%, 60%)'];

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsStats>({
    totalViews: 0,
    totalUsers: 0,
    totalSessions: 0,
    avgViewsPerSession: 0,
  });
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [dailyViews, setDailyViews] = useState<DailyView[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchAnalytics();
    }
  }, [timeRange, loading]);

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

    setLoading(false);
  };

  const fetchAnalytics = async () => {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));
      const dateFilter = daysAgo.toISOString();

      // Fetch total views
      const { count: totalViews } = await supabase
        .from("analytics")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dateFilter);

      // Fetch unique users
      const { data: uniqueUsers } = await supabase
        .from("analytics")
        .select("user_id")
        .gte("created_at", dateFilter);

      const uniqueUserCount = new Set(uniqueUsers?.map(u => u.user_id).filter(Boolean)).size;

      // Fetch unique sessions
      const { data: uniqueSessions } = await supabase
        .from("analytics")
        .select("session_id")
        .gte("created_at", dateFilter);

      const uniqueSessionCount = new Set(uniqueSessions?.map(s => s.session_id)).size;

      setStats({
        totalViews: totalViews || 0,
        totalUsers: uniqueUserCount,
        totalSessions: uniqueSessionCount,
        avgViewsPerSession: uniqueSessionCount > 0 ? Math.round((totalViews || 0) / uniqueSessionCount) : 0,
      });

      // Fetch top pages
      const { data: analyticsData } = await supabase
        .from("analytics")
        .select("page_path")
        .gte("created_at", dateFilter);

      const pageCounts: { [key: string]: number } = {};
      analyticsData?.forEach(item => {
        pageCounts[item.page_path] = (pageCounts[item.page_path] || 0) + 1;
      });

      const topPages = Object.entries(pageCounts)
        .map(([page_path, views]) => ({ page_path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      setPageViews(topPages);

      // Fetch traffic sources
      const { data: referrerData } = await supabase
        .from("analytics")
        .select("referrer")
        .gte("created_at", dateFilter);

      const sourceCounts: { [key: string]: number } = {};
      referrerData?.forEach(item => {
        const source = item.referrer || "Direct";
        const domain = source === "Direct" ? "Direct" : new URL(source).hostname;
        sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
      });

      const topSources = Object.entries(sourceCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setTrafficSources(topSources);

      // Fetch daily views
      const { data: dailyData } = await supabase
        .from("analytics")
        .select("created_at")
        .gte("created_at", dateFilter)
        .order("created_at", { ascending: true });

      const dailyCounts: { [key: string]: number } = {};
      dailyData?.forEach(item => {
        const date = new Date(item.created_at).toLocaleDateString();
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

      const dailyViewsData = Object.entries(dailyCounts)
        .map(([date, views]) => ({ date, views }))
        .slice(-14); // Last 14 days

      setDailyViews(dailyViewsData);

      // Fetch top posts
      const { data: postViewsData } = await supabase
        .from("post_views")
        .select(`
          post_id,
          posts:post_id (title)
        `)
        .gte("created_at", dateFilter);

      const postCounts: { [key: string]: { title: string; count: number } } = {};
      postViewsData?.forEach((item: any) => {
        const title = item.posts?.title || "Unknown";
        if (!postCounts[title]) {
          postCounts[title] = { title, count: 0 };
        }
        postCounts[title].count++;
      });

      const topPostsData = Object.values(postCounts)
        .map(p => ({ title: p.title, views: p.count }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      setTopPosts(topPostsData);

    } catch (error: any) {
      toast({ title: "Error fetching analytics", description: error.message, variant: "destructive" });
    }
  };

  if (loading) return <AdminLayout><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Track views, traffic sources, and user engagement</p>
          </div>
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as '7' | '30' | '90')}>
            <TabsList>
              <TabsTrigger value="7">7 Days</TabsTrigger>
              <TabsTrigger value="30">30 Days</TabsTrigger>
              <TabsTrigger value="90">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Page views in selected period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Authenticated users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Unique sessions tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg. Views/Session</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgViewsPerSession}</div>
              <p className="text-xs text-muted-foreground">Pages per session</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Views Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Views Trend</CardTitle>
              <CardDescription>Page views over the last 14 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyViews}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} name="Views" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Traffic Sources Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>Where your visitors come from</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trafficSources}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {trafficSources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Pages Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
              <CardDescription>Most visited pages</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pageViews} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="page_path" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Posts Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top Blog Posts</CardTitle>
              <CardDescription>Most viewed blog posts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topPosts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="title" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={150} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="views" fill="hsl(var(--accent))" name="Views" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
