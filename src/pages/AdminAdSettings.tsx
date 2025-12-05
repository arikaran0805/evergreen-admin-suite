import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Switch } from "@/components/ui/switch";
import { Save, RefreshCw, DollarSign, LayoutGrid, FileCode, Eye, Monitor, Smartphone, CheckCircle, AlertCircle } from "lucide-react";

interface AdPreviewBoxProps {
  label: string;
  slot: string;
  client: string;
  type: "horizontal" | "sidebar" | "mobile";
  thirdParty?: string;
}

const AdPreviewBox = ({ label, slot, client, type, thirdParty }: AdPreviewBoxProps) => {
  const isConfigured = (slot && slot.length > 0) || (thirdParty && thirdParty.length > 0);
  const hasClient = client && client.length > 0;
  const isThirdParty = thirdParty && thirdParty.length > 0;
  
  const heightClass = type === "sidebar" ? "h-[250px]" : type === "mobile" ? "h-[100px]" : "h-[90px]";
  
  return (
    <div 
      className={`${heightClass} border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 transition-colors ${
        isConfigured && hasClient 
          ? "border-primary/50 bg-primary/5" 
          : isThirdParty 
            ? "border-amber-500/50 bg-amber-500/5"
            : "border-muted-foreground/30 bg-muted/20"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isConfigured && hasClient ? (
          <CheckCircle className="h-4 w-4 text-primary" />
        ) : isThirdParty ? (
          <CheckCircle className="h-4 w-4 text-amber-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>
      {isThirdParty ? (
        <span className="text-xs text-amber-600">Third-party code</span>
      ) : isConfigured && hasClient ? (
        <span className="text-xs text-primary">Slot: {slot.substring(0, 10)}...</span>
      ) : (
        <span className="text-xs text-muted-foreground">
          {!hasClient ? "Missing Ad Client" : "No slot configured"}
        </span>
      )}
    </div>
  );
};

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
            <div className="space-y-6">
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
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="auto_ads" className="text-base">Enable Auto Ads</Label>
                  <p className="text-sm text-muted-foreground">
                    Let Google automatically place and optimize ads on your site
                  </p>
                </div>
                <Switch
                  id="auto_ads"
                  checked={getSettingValue("auto_ads") === "true"}
                  onCheckedChange={(checked) => handleChange("auto_ads", checked.toString())}
                />
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

        {/* Ad Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Ad Preview
            </CardTitle>
            <CardDescription>
              Preview how your ads will appear on your site (mock placeholders)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="desktop" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="desktop" className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Desktop
                </TabsTrigger>
                <TabsTrigger value="mobile" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="desktop">
                <div className="grid grid-cols-3 gap-6">
                  {/* Main Content Area */}
                  <div className="col-span-2 space-y-4">
                    <div className="bg-muted/30 rounded-lg p-4 border">
                      <h3 className="font-semibold text-lg mb-2">Article Title</h3>
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    </div>
                    
                    {/* In-Content Top Ad */}
                    <AdPreviewBox 
                      label="In-Content Top" 
                      slot={getSettingValue("in_content_top_slot")}
                      client={getSettingValue("google_ad_client")}
                      type="horizontal"
                    />
                    
                    <div className="bg-muted/30 rounded-lg p-4 border">
                      <div className="h-4 bg-muted rounded w-full mb-2"></div>
                      <div className="h-4 bg-muted rounded w-5/6 mb-2"></div>
                      <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    </div>
                    
                    {/* In-Content Middle Ad */}
                    <AdPreviewBox 
                      label="In-Content Middle" 
                      slot={getSettingValue("in_content_middle_slot")}
                      client={getSettingValue("google_ad_client")}
                      type="horizontal"
                    />
                    
                    <div className="bg-muted/30 rounded-lg p-4 border">
                      <div className="h-4 bg-muted rounded w-full mb-2"></div>
                      <div className="h-4 bg-muted rounded w-4/5 mb-2"></div>
                    </div>
                    
                    {/* In-Content Bottom Ad */}
                    <AdPreviewBox 
                      label="In-Content Bottom" 
                      slot={getSettingValue("in_content_bottom_slot")}
                      client={getSettingValue("google_ad_client")}
                      type="horizontal"
                    />
                  </div>
                  
                  {/* Sidebar */}
                  <div className="space-y-4">
                    <AdPreviewBox 
                      label="Sidebar Top" 
                      slot={getSettingValue("sidebar_top_slot")}
                      client={getSettingValue("google_ad_client")}
                      type="sidebar"
                    />
                    <AdPreviewBox 
                      label="Sidebar Middle" 
                      slot={getSettingValue("sidebar_middle_slot")}
                      client={getSettingValue("google_ad_client")}
                      type="sidebar"
                      thirdParty={getSettingValue("third_party_sidebar_code")}
                    />
                    <AdPreviewBox 
                      label="Sidebar Bottom" 
                      slot={getSettingValue("sidebar_bottom_slot")}
                      client={getSettingValue("google_ad_client")}
                      type="sidebar"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="mobile">
                <div className="max-w-sm mx-auto space-y-4">
                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <h3 className="font-semibold text-lg mb-2">Article Title</h3>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  </div>
                  
                  <AdPreviewBox 
                    label="In-Content Top" 
                    slot={getSettingValue("in_content_top_slot")}
                    client={getSettingValue("google_ad_client")}
                    type="mobile"
                  />
                  
                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                  </div>
                  
                  <AdPreviewBox 
                    label="In-Content Middle" 
                    slot={getSettingValue("in_content_middle_slot")}
                    client={getSettingValue("google_ad_client")}
                    type="mobile"
                  />
                  
                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                  </div>
                  
                  <AdPreviewBox 
                    label="In-Content Bottom" 
                    slot={getSettingValue("in_content_bottom_slot")}
                    client={getSettingValue("google_ad_client")}
                    type="mobile"
                  />
                </div>
              </TabsContent>
            </Tabs>
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
