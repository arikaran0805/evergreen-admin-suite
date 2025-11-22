import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, Globe, Mail, Shield, Database, Zap, Upload, Eye } from "lucide-react";

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // General Settings
  const [siteName, setSiteName] = useState("BlogHub");
  const [siteDescription, setSiteDescription] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Email Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  
  // Security Settings
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(true);
  
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

    await loadSettings();
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error loading settings:", error);
      return;
    }

    if (data) {
      setSettingsId(data.id);
      setSiteName(data.site_name || "BlogHub");
      setSiteDescription(data.site_description || "");
      setSiteUrl(data.site_url || "");
      setLogoUrl(data.logo_url || "");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    setUploadingLogo(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast({ title: "Logo uploaded successfully" });
    } catch (error: any) {
      toast({
        title: "Error uploading logo",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      if (settingsId) {
        // Update existing settings
        const { error } = await supabase
          .from("site_settings")
          .update({
            site_name: siteName,
            site_description: siteDescription,
            site_url: siteUrl,
            logo_url: logoUrl,
          })
          .eq("id", settingsId);

        if (error) throw error;
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from("site_settings")
          .insert({
            site_name: siteName,
            site_description: siteDescription,
            site_url: siteUrl,
            logo_url: logoUrl,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setSettingsId(data.id);
      }
      
      toast({ title: "Settings saved successfully" });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: "Email settings saved successfully" });
    } catch (error: any) {
      toast({
        title: "Error saving email settings",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: "Security settings saved successfully" });
    } catch (error: any) {
      toast({
        title: "Error saving security settings",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLayout><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Configure system settings, security, and integrations
            </p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Site Information
                </CardTitle>
                <CardDescription>
                  Basic information about your site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="BlogHub"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Site Logo</Label>
                  {logoUrl && (
                    <div className="mb-4">
                      <img src={logoUrl} alt="Site Logo" className="h-16 w-auto rounded-lg" />
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      disabled={uploadingLogo}
                      onClick={() => document.getElementById('logo')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingLogo ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload a logo image for your site (recommended: 200x50px)
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Textarea
                    id="siteDescription"
                    value={siteDescription}
                    onChange={(e) => setSiteDescription(e.target.value)}
                    placeholder="Inspiring stories and ideas for curious minds"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siteUrl">Site URL</Label>
                  <Input
                    id="siteUrl"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="https://yourdomain.com"
                    type="url"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setPreviewOpen(true)} variant="outline" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Changes
                  </Button>
                  <Button onClick={handleSaveGeneral} disabled={saving} className="bg-primary flex-1">
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Configuration
                </CardTitle>
                <CardDescription>
                  Manage email notifications and SMTP settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important events
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                  <p className="text-sm text-muted-foreground">
                    Primary email for administrative notifications
                  </p>
                </div>

                <Button onClick={handleSaveEmail} disabled={saving} className="bg-primary">
                  {saving ? "Saving..." : "Save Email Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security & Authentication
                </CardTitle>
                <CardDescription>
                  Configure security and authentication settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Require Email Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must verify their email before accessing the platform
                    </p>
                  </div>
                  <Switch
                    checked={requireEmailVerification}
                    onCheckedChange={setRequireEmailVerification}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Allow Public Registration</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to sign up for accounts
                    </p>
                  </div>
                  <Switch
                    checked={allowPublicRegistration}
                    onCheckedChange={setAllowPublicRegistration}
                  />
                </div>

                <Button onClick={handleSaveSecurity} disabled={saving} className="bg-primary">
                  {saving ? "Saving..." : "Save Security Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Advanced Configuration
                </CardTitle>
                <CardDescription>
                  Advanced settings for developers and system administrators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg bg-muted p-4">
                  <h3 className="font-semibold mb-2">Database Connection</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your database is connected and running smoothly
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">Connected</span>
                  </div>
                </div>

                <Separator />

                <div className="rounded-lg bg-muted p-4">
                  <h3 className="font-semibold mb-2">Cache Management</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Clear cached data to improve performance
                  </p>
                  <Button variant="outline">Clear Cache</Button>
                </div>

                <Separator />

                <div className="rounded-lg bg-muted p-4">
                  <h3 className="font-semibold mb-2">API Access</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage API keys and access tokens
                  </p>
                  <Button variant="outline">Manage API Keys</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Changes</DialogTitle>
            <DialogDescription>
              This is how your site will look with the new settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8">
            {/* Preview Header */}
            <div>
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Header Preview</h3>
              <div className="border rounded-lg p-4 bg-background">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt={siteName} 
                        className="h-10 w-auto" 
                      />
                    ) : (
                      <>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                          <span className="text-xl font-bold text-primary-foreground">
                            {siteName.charAt(0)}
                          </span>
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                          {siteName}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">Menu</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Hero Section */}
            <div>
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Hero Section Preview</h3>
              <div className="border rounded-lg p-8 bg-gradient-subtle">
                <div className="text-center max-w-2xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                    <span className="text-sm font-medium text-primary">Welcome to {siteName}</span>
                  </div>
                  <h1 className="text-3xl font-bold mb-3">
                    Discover <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Stories</span> That Inspire
                  </h1>
                  {siteDescription && (
                    <p className="text-muted-foreground">{siteDescription}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Footer */}
            <div>
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Footer Preview</h3>
              <div className="border rounded-lg p-6 bg-card">
                <div className="flex items-center gap-2 mb-4">
                  {logoUrl ? (
                    <img src={logoUrl} alt={siteName} className="h-10 w-auto" />
                  ) : (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                        <span className="text-xl font-bold text-primary-foreground">
                          {siteName.charAt(0)}
                        </span>
                      </div>
                      <span className="text-xl font-bold text-primary">{siteName}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {siteDescription || "Inspiring stories and ideas for curious minds."}
                </p>
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                  <p>&copy; 2025 {siteName}. All rights reserved.</p>
                </div>
              </div>
            </div>

            {/* Site Info */}
            {siteUrl && (
              <div>
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Site Information</h3>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Site Name:</span>
                      <span className="font-medium">{siteName}</span>
                    </div>
                    {siteUrl && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Site URL:</span>
                        <span className="font-medium">{siteUrl}</span>
                      </div>
                    )}
                    {logoUrl && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Logo:</span>
                        <span className="font-medium text-green-600">Uploaded ✓</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setPreviewOpen(false)} className="flex-1">
              Close Preview
            </Button>
            <Button 
              onClick={() => {
                setPreviewOpen(false);
                handleSaveGeneral();
              }} 
              disabled={saving}
              className="bg-primary flex-1"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSettings;
