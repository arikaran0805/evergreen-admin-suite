import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { 
  Users, FileText, AlertTriangle, TrendingUp, TrendingDown, 
  DollarSign, Shield, Settings, Trash2, UserCog,
  Activity, Clock, Eye, CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { format, subDays } from "date-fns";

interface ActivityLog {
  id: string;
  action: string;
  performed_by: string;
  content_type: string;
  created_at: string;
  profile?: { full_name: string | null };
}

interface TrendData {
  current: number;
  previous: number;
  change: number;
  trend: "up" | "down" | "neutral";
  percentage: number;
}

interface KpiTrendStats {
  totalUsers: TrendData;
  activeUsers: TrendData;
  totalPosts: TrendData;
  pendingApprovals: TrendData;
  reportedContent: TrendData;
  revenue: TrendData;
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState<KpiTrendStats>({
    totalUsers: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    activeUsers: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    totalPosts: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    pendingApprovals: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    reportedContent: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    revenue: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
  });
  const [criticalAlerts, setCriticalAlerts] = useState<{
    pendingPosts: number;
    deleteRequests: number;
    reportedComments: number;
  }>({ pendingPosts: 0, deleteRequests: 0, reportedComments: 0 });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState({
    newUsersThisWeek: 0,
    postsPerDay: 0,
    avgApprovalTime: "< 24h",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin");

      if (roleError || !roleData || roleData.length === 0) {
        toast({ title: "Access Denied", variant: "destructive" });
        navigate("/admin");
        return;
      }

      await Promise.all([
        fetchStats(),
        fetchCriticalAlerts(),
        fetchActivityLogs(),
        fetchAnalyticsSnapshot(),
      ]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = (current: number, previous: number): TrendData => {
    const change = current - previous;
    if (change === 0) return { current, previous, change: 0, trend: "neutral", percentage: 0 };
    const percentage = previous === 0 ? (current > 0 ? 100 : 0) : Math.round((Math.abs(change) / previous) * 100);
    return {
      current,
      previous,
      change,
      trend: change > 0 ? "up" : "down",
      percentage,
    };
  };

  const fetchStats = async () => {
    try {
      const now = new Date();
      const oneDayAgo = subDays(now, 1);
      const twoDaysAgo = subDays(now, 2);
      const sevenDaysAgo = subDays(now, 7);
      const fourteenDaysAgo = subDays(now, 14);

      // Total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Users created in last 7 days vs previous 7 days
      const { count: newUsersThisWeek } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      const { count: newUsersPrevWeek } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", fourteenDaysAgo.toISOString())
        .lt("created_at", sevenDaysAgo.toISOString());

      // Active users this week vs previous week
      const { count: activeUsersThisWeek } = await supabase
        .from("lesson_progress")
        .select("user_id", { count: "exact", head: true })
        .gte("viewed_at", sevenDaysAgo.toISOString());

      const { count: activeUsersPrevWeek } = await supabase
        .from("lesson_progress")
        .select("user_id", { count: "exact", head: true })
        .gte("viewed_at", fourteenDaysAgo.toISOString())
        .lt("viewed_at", sevenDaysAgo.toISOString());

      // Total posts
      const { count: totalPosts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });

      const { count: postsThisWeek } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      const { count: postsPrevWeek } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", fourteenDaysAgo.toISOString())
        .lt("created_at", sevenDaysAgo.toISOString());

      // Pending approvals - today vs yesterday
      const { count: pendingApprovalsNow } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Reported content - today vs yesterday
      const { count: reportedContentNow } = await supabase
        .from("content_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: reportsAddedToday } = await supabase
        .from("content_reports")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneDayAgo.toISOString());

      const { count: reportsResolvedToday } = await supabase
        .from("content_reports")
        .select("*", { count: "exact", head: true })
        .neq("status", "pending")
        .gte("updated_at", oneDayAgo.toISOString());

      // Calculate reported content trend based on net change today
      const reportedNetChange = (reportsAddedToday || 0) - (reportsResolvedToday || 0);

      setStats({
        totalUsers: calculateTrend(totalUsers || 0, (totalUsers || 0) - (newUsersThisWeek || 0)),
        activeUsers: calculateTrend(activeUsersThisWeek || 0, activeUsersPrevWeek || 0),
        totalPosts: {
          ...calculateTrend(totalPosts || 0, (totalPosts || 0) - (postsThisWeek || 0)),
          change: postsThisWeek || 0,
        },
        pendingApprovals: {
          current: pendingApprovalsNow || 0,
          previous: 0,
          change: pendingApprovalsNow || 0,
          trend: (pendingApprovalsNow || 0) > 0 ? "up" : "neutral",
          percentage: 0,
        },
        reportedContent: {
          current: reportedContentNow || 0,
          previous: 0,
          change: reportedNetChange,
          trend: reportedNetChange > 0 ? "up" : reportedNetChange < 0 ? "down" : "neutral",
          percentage: 0,
        },
        revenue: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchCriticalAlerts = async () => {
    try {
      const { count: pendingPosts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: deleteRequests } = await supabase
        .from("delete_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: reportedComments } = await supabase
        .from("content_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("content_type", "comment");

      setCriticalAlerts({
        pendingPosts: pendingPosts || 0,
        deleteRequests: deleteRequests || 0,
        reportedComments: reportedComments || 0,
      });
    } catch (error) {
      console.error("Error fetching critical alerts:", error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const { data } = await supabase
        .from("approval_history")
        .select(`
          id,
          action,
          performed_by,
          content_type,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        // Fetch profile names for each log entry
        const profileIds = [...new Set(data.map(log => log.performed_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", profileIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        
        setActivityLogs(data.map(log => ({
          ...log,
          profile: { full_name: profileMap.get(log.performed_by) || "Unknown User" }
        })));
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    }
  };

  const fetchAnalyticsSnapshot = async () => {
    try {
      const sevenDaysAgo = subDays(new Date(), 7);
      
      const { count: newUsersThisWeek } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      const { count: postsThisWeek } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      setAnalyticsSnapshot({
        newUsersThisWeek: newUsersThisWeek || 0,
        postsPerDay: Math.round((postsThisWeek || 0) / 7),
        avgApprovalTime: "< 24h",
      });
    } catch (error) {
      console.error("Error fetching analytics snapshot:", error);
    }
  };

  // KPI Trend Indicator Component
  interface TrendIndicatorProps {
    data: TrendData;
    type: "users" | "active" | "posts" | "pending" | "reported" | "revenue";
    invertColors?: boolean;
  }

  const KpiTrendIndicator = ({ data, type, invertColors = false }: TrendIndicatorProps) => {
    const { trend, change, percentage } = data;

    // For pending and reported, increase is bad (red), decrease is good (green)
    const isPositive = invertColors ? trend === "down" : trend === "up";
    const isNegative = invertColors ? trend === "up" : trend === "down";

    const colorClass = isPositive 
      ? "text-emerald-600 dark:text-emerald-400" 
      : isNegative 
        ? "text-red-500 dark:text-red-400" 
        : "text-muted-foreground";

    const formatChange = () => {
      const sign = change > 0 ? "+" : "";
      switch (type) {
        case "users":
          return `${sign}${change} this week`;
        case "active":
          if (percentage > 0) return `${sign}${percentage}% vs last week`;
          return `${sign}${change} users`;
        case "posts":
          if (percentage > 0) return `${sign}${change} this week (+${percentage}%)`;
          return `${sign}${change} this week`;
        case "pending":
          if (change > 0) return `+${change} today`;
          if (change < 0) return `${change} resolved`;
          return "No change";
        case "reported":
          if (change > 0) return `+${change} today`;
          if (change < 0) return `${Math.abs(change)} resolved`;
          return "No change";
        case "revenue":
          if (change === 0) return "No change";
          return `${sign}$${Math.abs(change).toLocaleString()} this month`;
        default:
          return `${sign}${change}`;
      }
    };

    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

    return (
      <div 
        className={`flex items-center gap-1 text-xs mt-1 ${colorClass}`}
        title="Compared to previous period"
      >
        {TrendIcon && <TrendIcon className="h-3 w-3" />}
        {trend === "neutral" && <span className="text-muted-foreground">—</span>}
        <span>{formatChange()}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const totalCriticalAlerts = criticalAlerts.pendingPosts + criticalAlerts.deleteRequests + criticalAlerts.reportedComments;

  return (
    <div className="dashboard-bg min-h-screen -m-8 p-8">
      <div className="space-y-6">
        {/* Premium Header */}
        <div className="animate-stagger-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 badge-premium">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          </div>
          <p className="text-muted-foreground">Platform overview & system control</p>
        </div>

        {/* KPI Cards - Premium Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-stagger-2">
          <Card className="card-premium">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Users</span>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.totalUsers.current.toLocaleString()}</div>
              <KpiTrendIndicator data={stats.totalUsers} type="users" />
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active (7d)</span>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.activeUsers.current.toLocaleString()}</div>
              <KpiTrendIndicator data={stats.activeUsers} type="active" />
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Posts</span>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.totalPosts.current.toLocaleString()}</div>
              <KpiTrendIndicator data={stats.totalPosts} type="posts" />
            </CardContent>
          </Card>

          <Card className="card-premium border-amber-200/50 dark:border-amber-900/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</span>
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.pendingApprovals.current}</div>
              <KpiTrendIndicator data={stats.pendingApprovals} type="pending" invertColors />
            </CardContent>
          </Card>

          <Card className="card-premium border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reported</span>
                <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.reportedContent.current}</div>
              <KpiTrendIndicator data={stats.reportedContent} type="reported" invertColors />
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</span>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">${stats.revenue.current.toLocaleString()}</div>
              <KpiTrendIndicator data={stats.revenue} type="revenue" />
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-stagger-3">
          {/* Needs Attention Panel */}
          <Card className="card-premium border-amber-200/50 dark:border-amber-800/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  Needs Attention
                </CardTitle>
                {totalCriticalAlerts > 0 && (
                  <Badge variant="destructive" className="badge-premium">{totalCriticalAlerts}</Badge>
                )}
              </div>
              <CardDescription>Critical items requiring review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/admin/approvals">
                <div className="flex items-center justify-between p-3 rounded-xl bg-card hover:bg-muted/50 transition-all border border-border/50 hover:border-primary/20 hover:shadow-sm group">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium">Pending Posts</span>
                  </div>
                  <Badge variant="secondary" className="rounded-full">{criticalAlerts.pendingPosts}</Badge>
                </div>
              </Link>

              <Link to="/admin/delete-requests">
                <div className="flex items-center justify-between p-3 rounded-xl bg-card hover:bg-muted/50 transition-all border border-border/50 hover:border-primary/20 hover:shadow-sm group">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </div>
                    <span className="text-sm font-medium">Delete Requests</span>
                  </div>
                  <Badge variant="secondary" className="rounded-full">{criticalAlerts.deleteRequests}</Badge>
                </div>
              </Link>

              <Link to="/admin/reports">
                <div className="flex items-center justify-between p-3 rounded-xl bg-card hover:bg-muted/50 transition-all border border-border/50 hover:border-primary/20 hover:shadow-sm group">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="text-sm font-medium">Reported Comments</span>
                  </div>
                  <Badge variant="secondary" className="rounded-full">{criticalAlerts.reportedComments}</Badge>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Actions - Premium Grid */}
          <Card className="lg:col-span-2 card-premium card-shine">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Settings className="h-4 w-4 text-primary" />
                </div>
                Quick Actions
              </CardTitle>
              <CardDescription>Admin-only platform controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Link to="/admin/users">
                  <Button variant="outline" className="w-full h-auto py-5 flex flex-col items-center gap-2 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Manage Users</span>
                  </Button>
                </Link>
                <Link to="/admin/authors">
                  <Button variant="outline" className="w-full h-auto py-5 flex flex-col items-center gap-2 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UserCog className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Roles & Permissions</span>
                  </Button>
                </Link>
                <Link to="/admin/monetization">
                  <Button variant="outline" className="w-full h-auto py-5 flex flex-col items-center gap-2 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Monetization</span>
                  </Button>
                </Link>
                <Link to="/admin/delete-requests">
                  <Button variant="outline" className="w-full h-auto py-5 flex flex-col items-center gap-2 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                    <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <span className="text-sm font-medium">Delete Requests</span>
                  </Button>
                </Link>
                <Link to="/admin/settings">
                  <Button variant="outline" className="w-full h-auto py-5 flex flex-col items-center gap-2 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Platform Settings</span>
                  </Button>
                </Link>
                <Link to="/admin/analytics">
                  <Button variant="outline" className="w-full h-auto py-5 flex flex-col items-center gap-2 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">View Analytics</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-stagger-4">
          {/* Analytics Snapshot */}
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                Analytics Snapshot
              </CardTitle>
              <CardDescription>Key metrics at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="text-2xl font-bold text-primary">
                    {analyticsSnapshot.newUsersThisWeek}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">New Users (7d)</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="text-2xl font-bold text-primary">
                    {analyticsSnapshot.postsPerDay}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Posts/Day</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="text-2xl font-bold text-primary">
                    {analyticsSnapshot.avgApprovalTime}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Avg Approval</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                Activity Log
              </CardTitle>
              <CardDescription>Recent admin & moderator actions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[180px]">
                <div className="space-y-2">
                  {activityLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          log.action === "approved" ? "bg-primary/10" :
                          log.action === "rejected" ? "bg-destructive/10" :
                          "bg-muted"
                        }`}>
                          {log.action === "approved" ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : log.action === "rejected" ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Activity className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{log.profile?.full_name || "User"}</span>
                            <span className="text-muted-foreground"> {log.action} </span>
                            <span className="font-medium">{log.content_type}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
