import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Save, RefreshCw, DollarSign, LayoutGrid, FileCode } from "lucide-react";

interface AdSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  description: string | null;
}

const AdminAdSettings = () => {
  const [settings, setSettings] = useState<AdSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ad_settings")
        .select("*")
        .order("setting_key");

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev =>
      prev.map(s =>
        s.setting_key === key ? { ...s, setting_value: value } : s
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const setting of settings) {
        const { error } = await supabase
          .from("ad_settings")
          .update({ setting_value: setting.setting_value })
          .eq("setting_key", setting.setting_key);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Ad settings saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSetting = (key: string) => {
    return settings.find(s => s.setting_key === key);
  };

  const getSettingValue = (key: string) => {
    return getSetting(key)?.setting_value || "";
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ad Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure Google AdSense and third-party ad integration
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>

        {/* Google AdSense Publisher ID */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Google AdSense Configuration
            </CardTitle>
            <CardDescription>
              Enter your Google AdSense Publisher ID to enable ads across your site
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="google_ad_client">Publisher ID (Ad Client)</Label>
                <Input
                  id="google_ad_client"
                  placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                  value={getSettingValue("google_ad_client")}
                  onChange={(e) => handleChange("google_ad_client", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {getSetting("google_ad_client")?.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Ad Slots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Sidebar Ad Slots
            </CardTitle>
            <CardDescription>
              Configure ad slot IDs for sidebar positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sidebar_top_slot">Sidebar Top Slot</Label>
                <Input
                  id="sidebar_top_slot"
                  placeholder="1234567890"
                  value={getSettingValue("sidebar_top_slot")}
                  onChange={(e) => handleChange("sidebar_top_slot", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Top sidebar ad position</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sidebar_middle_slot">Sidebar Middle Slot</Label>
                <Input
                  id="sidebar_middle_slot"
                  placeholder="2345678901"
                  value={getSettingValue("sidebar_middle_slot")}
                  onChange={(e) => handleChange("sidebar_middle_slot", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Middle sidebar ad position</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sidebar_bottom_slot">Sidebar Bottom Slot</Label>
                <Input
                  id="sidebar_bottom_slot"
                  placeholder="3456789012"
                  value={getSettingValue("sidebar_bottom_slot")}
                  onChange={(e) => handleChange("sidebar_bottom_slot", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Bottom sidebar ad position</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In-Content Ad Slots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              In-Content Ad Slots
            </CardTitle>
            <CardDescription>
              Configure ad slot IDs for in-content positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="in_content_top_slot">In-Content Top Slot</Label>
                <Input
                  id="in_content_top_slot"
                  placeholder="4567890123"
                  value={getSettingValue("in_content_top_slot")}
                  onChange={(e) => handleChange("in_content_top_slot", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Below title/header</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="in_content_middle_slot">In-Content Middle Slot</Label>
                <Input
                  id="in_content_middle_slot"
                  placeholder="5678901234"
                  value={getSettingValue("in_content_middle_slot")}
                  onChange={(e) => handleChange("in_content_middle_slot", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">After 3rd paragraph</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="in_content_bottom_slot">In-Content Bottom Slot</Label>
                <Input
                  id="in_content_bottom_slot"
                  placeholder="6789012345"
                  value={getSettingValue("in_content_bottom_slot")}
                  onChange={(e) => handleChange("in_content_bottom_slot", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Before comments/related</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Third-Party Ad Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-primary" />
              Third-Party Ad Code
            </CardTitle>
            <CardDescription>
              Optional: Custom ad code for the sidebar middle position (overrides AdSense)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="third_party_sidebar_code">Custom Ad Code (HTML/Script)</Label>
              <Textarea
                id="third_party_sidebar_code"
                placeholder="<script>...</script> or <div>...</div>"
                rows={6}
                value={getSettingValue("third_party_sidebar_code")}
                onChange={(e) => handleChange("third_party_sidebar_code", e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                If provided, this code will be used instead of AdSense for the sidebar middle position
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save All Settings
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAdSettings;
