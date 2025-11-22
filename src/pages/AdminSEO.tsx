import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";

const AdminSEO = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    og_image: "",
    og_title: "",
    og_description: "",
    twitter_card_type: "summary_large_image",
    twitter_site: "",
  });

  useEffect(() => {
    checkAuth();
    fetchSettings();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (!roles || roles.role !== "admin") {
      navigate("/");
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch SEO settings.",
        variant: "destructive",
      });
    } else if (data) {
      setSettingsId(data.id);
      setFormData({
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
        meta_keywords: data.meta_keywords || "",
        og_image: data.og_image || "",
        og_title: data.og_title || "",
        og_description: data.og_description || "",
        twitter_card_type: data.twitter_card_type || "summary_large_image",
        twitter_site: data.twitter_site || "",
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("site_settings")
      .update(formData)
      .eq("id", settingsId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update SEO settings.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "SEO settings updated successfully.",
      });
    }
    setSaving(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">SEO Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage meta tags and Open Graph settings for better search engine optimization
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Meta Tags</CardTitle>
              <CardDescription>
                Default meta tags that will be used across your site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => handleChange("meta_title", e.target.value)}
                  placeholder="Your Site Title - Best Blog Platform"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.meta_title.length}/60 characters (recommended)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => handleChange("meta_description", e.target.value)}
                  placeholder="A brief description of your site that appears in search results"
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.meta_description.length}/160 characters (recommended)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_keywords">Meta Keywords</Label>
                <Input
                  id="meta_keywords"
                  value={formData.meta_keywords}
                  onChange={(e) => handleChange("meta_keywords", e.target.value)}
                  placeholder="blog, technology, lifestyle, education"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated keywords
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open Graph Tags</CardTitle>
              <CardDescription>
                Settings for social media sharing (Facebook, LinkedIn, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="og_title">OG Title</Label>
                <Input
                  id="og_title"
                  value={formData.og_title}
                  onChange={(e) => handleChange("og_title", e.target.value)}
                  placeholder="Title that appears when shared on social media"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="og_description">OG Description</Label>
                <Textarea
                  id="og_description"
                  value={formData.og_description}
                  onChange={(e) => handleChange("og_description", e.target.value)}
                  placeholder="Description that appears when shared on social media"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="og_image">OG Image URL</Label>
                <Input
                  id="og_image"
                  value={formData.og_image}
                  onChange={(e) => handleChange("og_image", e.target.value)}
                  placeholder="https://example.com/og-image.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended size: 1200x630px
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Twitter Card Settings</CardTitle>
              <CardDescription>
                Settings for Twitter/X sharing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twitter_card_type">Twitter Card Type</Label>
                <Input
                  id="twitter_card_type"
                  value={formData.twitter_card_type}
                  onChange={(e) => handleChange("twitter_card_type", e.target.value)}
                  placeholder="summary_large_image"
                />
                <p className="text-xs text-muted-foreground">
                  Common values: summary, summary_large_image
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter_site">Twitter Site Handle</Label>
                <Input
                  id="twitter_site"
                  value={formData.twitter_site}
                  onChange={(e) => handleChange("twitter_site", e.target.value)}
                  placeholder="@yoursitehandle"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="min-w-32">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminSEO;
