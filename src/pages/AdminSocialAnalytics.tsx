import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Twitter, Facebook, Instagram, Linkedin, Youtube, Github, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ClickData {
  platform: string;
  clicks: number;
}

const platformIcons: Record<string, any> = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  github: Github,
};

const COLORS = ['#1DA1F2', '#4267B2', '#E4405F', '#0077B5', '#FF0000', '#333333'];

const AdminSocialAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [clickData, setClickData] = useState<ClickData[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
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

    await loadAnalytics();
    setLoading(false);
  };

  const loadAnalytics = async () => {
    const { data, error } = await supabase
      .from("social_media_clicks")
      .select("platform");

    if (error) {
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Aggregate clicks by platform
    const platformCounts: Record<string, number> = {};
    data.forEach((click) => {
      platformCounts[click.platform] = (platformCounts[click.platform] || 0) + 1;
    });

    const chartData = Object.entries(platformCounts).map(([platform, clicks]) => ({
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      clicks,
    }));

    setClickData(chartData);
    setTotalClicks(data.length);
  };

  if (loading) return <AdminLayout><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Social Media Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track engagement across your social media platforms
          </p>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Total Clicks
            </CardTitle>
            <CardDescription>All-time social media link clicks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{totalClicks}</p>
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clickData.map((data, index) => {
            const Icon = platformIcons[data.platform.toLowerCase()] || TrendingUp;
            return (
              <Card key={data.platform}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5" style={{ color: COLORS[index % COLORS.length] }} />
                    {data.platform}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                    {data.clicks}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {totalClicks > 0 ? ((data.clicks / totalClicks) * 100).toFixed(1) : 0}% of total
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts */}
        {clickData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Clicks by Platform</CardTitle>
                <CardDescription>Compare engagement across platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clickData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="platform" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="clicks" fill="#8884d8">
                      {clickData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Distribution</CardTitle>
                <CardDescription>Platform share of total clicks</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clickData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ platform, percent }) => `${platform} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="clicks"
                    >
                      {clickData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {clickData.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No social media clicks tracked yet. Share your links to start collecting data!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSocialAnalytics;
