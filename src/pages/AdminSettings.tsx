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
import { Settings, Globe, Mail, Shield, Database, Zap } from "lucide-react";

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // General Settings
  const [siteName, setSiteName] = useState("BlogHub");
  const [siteDescription, setSiteDescription] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  
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

    setLoading(false);
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      // Here you would save settings to your database
      // For now, we'll simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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

                <Button onClick={handleSaveGeneral} disabled={saving} className="bg-primary">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
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
    </AdminLayout>
  );
};

export default AdminSettings;
