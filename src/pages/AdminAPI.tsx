import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Webhook, Key, Globe, Copy, Eye, EyeOff } from "lucide-react";

interface WebhookType {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string | null;
  created_at: string;
}

interface APIIntegration {
  id: string;
  name: string;
  provider: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

const WEBHOOK_EVENTS = [
  { value: "post.created", label: "Post Created" },
  { value: "post.updated", label: "Post Updated" },
  { value: "post.published", label: "Post Published" },
  { value: "post.deleted", label: "Post Deleted" },
  { value: "comment.created", label: "Comment Created" },
  { value: "comment.approved", label: "Comment Approved" },
  { value: "user.registered", label: "User Registered" },
];

const AdminAPI = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [integrations, setIntegrations] = useState<APIIntegration[]>([]);
  
  // AdSense state
  const [adsenseConfig, setAdsenseConfig] = useState({
    clientId: "",
    autoAds: false,
  });
  const [savingAdsense, setSavingAdsense] = useState(false);

  // Webhook dialog state
  const [webhookDialog, setWebhookDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null);
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[],
    secret: "",
  });

  // Integration dialog state
  const [integrationDialog, setIntegrationDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<APIIntegration | null>(null);
  const [integrationForm, setIntegrationForm] = useState({
    name: "",
    provider: "",
    apiKey: "",
  });

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ type: "webhook" | "integration"; id: string } | null>(null);

  // Show secret state
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      toast({ title: "Access denied", description: "Admin access required", variant: "destructive" });
      navigate("/");
      return;
    }

    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchWebhooks(), fetchIntegrations(), fetchAdsenseConfig()]);
    setLoading(false);
  };

  const fetchWebhooks = async () => {
    const { data, error } = await supabase.from("webhooks").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching webhooks:", error);
    } else {
      setWebhooks(data || []);
    }
  };

  const fetchIntegrations = async () => {
    const { data, error } = await supabase.from("api_integrations").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching integrations:", error);
    } else {
      setIntegrations((data || []).map(item => ({
        ...item,
        config: (item.config || {}) as Record<string, unknown>
      })));
    }
  };

  const fetchAdsenseConfig = async () => {
    const { data } = await supabase
      .from("api_integrations")
      .select("*")
      .eq("provider", "google_adsense")
      .maybeSingle();
    
    if (data) {
      setAdsenseConfig({
        clientId: (data.config as Record<string, string>)?.client_id || "",
        autoAds: (data.config as Record<string, string>)?.auto_ads === "true",
      });
    }
  };

  const saveAdsenseConfig = async () => {
    setSavingAdsense(true);
    const config = {
      client_id: adsenseConfig.clientId,
      auto_ads: adsenseConfig.autoAds.toString(),
    };

    const { data: existing } = await supabase
      .from("api_integrations")
      .select("id")
      .eq("provider", "google_adsense")
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("api_integrations")
        .update({ config, is_active: !!adsenseConfig.clientId })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("api_integrations").insert({
        name: "Google AdSense",
        provider: "google_adsense",
        config,
        is_active: !!adsenseConfig.clientId,
      }));
    }

    setSavingAdsense(false);
    if (error) {
      toast({ title: "Error", description: "Failed to save AdSense config", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "AdSense configuration saved" });
      fetchIntegrations();
    }
  };

  const openWebhookDialog = (webhook?: WebhookType) => {
    if (webhook) {
      setEditingWebhook(webhook);
      setWebhookForm({
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret || "",
      });
    } else {
      setEditingWebhook(null);
      setWebhookForm({ name: "", url: "", events: [], secret: "" });
    }
    setWebhookDialog(true);
  };

  const saveWebhook = async () => {
    if (!webhookForm.name || !webhookForm.url) {
      toast({ title: "Error", description: "Name and URL are required", variant: "destructive" });
      return;
    }

    const payload = {
      name: webhookForm.name,
      url: webhookForm.url,
      events: webhookForm.events,
      secret: webhookForm.secret || null,
    };

    let error;
    if (editingWebhook) {
      ({ error } = await supabase.from("webhooks").update(payload).eq("id", editingWebhook.id));
    } else {
      ({ error } = await supabase.from("webhooks").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: "Failed to save webhook", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Webhook ${editingWebhook ? "updated" : "created"}` });
      setWebhookDialog(false);
      fetchWebhooks();
    }
  };

  const toggleWebhook = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("webhooks").update({ is_active }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to update webhook", variant: "destructive" });
    } else {
      fetchWebhooks();
    }
  };

  const openIntegrationDialog = (integration?: APIIntegration) => {
    if (integration) {
      setEditingIntegration(integration);
      setIntegrationForm({
        name: integration.name,
        provider: integration.provider,
        apiKey: (integration.config as Record<string, string>)?.api_key || "",
      });
    } else {
      setEditingIntegration(null);
      setIntegrationForm({ name: "", provider: "", apiKey: "" });
    }
    setIntegrationDialog(true);
  };

  const saveIntegration = async () => {
    if (!integrationForm.name || !integrationForm.provider) {
      toast({ title: "Error", description: "Name and provider are required", variant: "destructive" });
      return;
    }

    const payload = {
      name: integrationForm.name,
      provider: integrationForm.provider,
      config: { api_key: integrationForm.apiKey },
    };

    let error;
    if (editingIntegration) {
      ({ error } = await supabase.from("api_integrations").update(payload).eq("id", editingIntegration.id));
    } else {
      ({ error } = await supabase.from("api_integrations").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: "Failed to save integration", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Integration ${editingIntegration ? "updated" : "created"}` });
      setIntegrationDialog(false);
      fetchIntegrations();
    }
  };

  const toggleIntegration = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("api_integrations").update({ is_active }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to update integration", variant: "destructive" });
    } else {
      fetchIntegrations();
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    const table = deleteDialog.type === "webhook" ? "webhooks" : "api_integrations";
    const { error } = await supabase.from(table).delete().eq("id", deleteDialog.id);

    if (error) {
      toast({ title: "Error", description: `Failed to delete ${deleteDialog.type}`, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${deleteDialog.type === "webhook" ? "Webhook" : "Integration"} deleted` });
      deleteDialog.type === "webhook" ? fetchWebhooks() : fetchIntegrations();
    }
    setDeleteDialog(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  if (loading) {
    return <AdminLayout><div className="p-6">Loading...</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">API & Integrations</h1>
          <p className="text-muted-foreground">Manage webhooks, AdSense, and external API integrations</p>
        </div>

        <Tabs defaultValue="adsense" className="space-y-4">
          <TabsList>
            <TabsTrigger value="adsense">Google AdSense</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="integrations">External APIs</TabsTrigger>
          </TabsList>

          {/* Google AdSense Tab */}
          <TabsContent value="adsense">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Google AdSense Configuration
                </CardTitle>
                <CardDescription>Configure your Google AdSense account for displaying ads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adsense-client">AdSense Publisher ID (ca-pub-xxxxx)</Label>
                  <Input
                    id="adsense-client"
                    placeholder="ca-pub-1234567890123456"
                    value={adsenseConfig.clientId}
                    onChange={(e) => setAdsenseConfig({ ...adsenseConfig, clientId: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Find your Publisher ID in your AdSense account under Account → Account information
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-ads"
                    checked={adsenseConfig.autoAds}
                    onCheckedChange={(checked) => setAdsenseConfig({ ...adsenseConfig, autoAds: checked })}
                  />
                  <Label htmlFor="auto-ads">Enable Auto Ads</Label>
                </div>
                <Button onClick={saveAdsenseConfig} disabled={savingAdsense}>
                  {savingAdsense ? "Saving..." : "Save Configuration"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhooks
                  </CardTitle>
                  <CardDescription>Send real-time notifications to external services</CardDescription>
                </div>
                <Button onClick={() => openWebhookDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </CardHeader>
              <CardContent>
                {webhooks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No webhooks configured</p>
                ) : (
                  <div className="space-y-4">
                    {webhooks.map((webhook) => (
                      <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{webhook.name}</span>
                            <Badge variant={webhook.is_active ? "default" : "secondary"}>
                              {webhook.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate max-w-md">{webhook.url}</p>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={webhook.is_active}
                            onCheckedChange={(checked) => toggleWebhook(webhook.id, checked)}
                          />
                          <Button variant="ghost" size="icon" onClick={() => openWebhookDialog(webhook)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: "webhook", id: webhook.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* External APIs Tab */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    External API Integrations
                  </CardTitle>
                  <CardDescription>Connect third-party services</CardDescription>
                </div>
                <Button onClick={() => openIntegrationDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </CardHeader>
              <CardContent>
                {integrations.filter(i => i.provider !== "google_adsense").length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No integrations configured</p>
                ) : (
                  <div className="space-y-4">
                    {integrations.filter(i => i.provider !== "google_adsense").map((integration) => (
                      <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{integration.name}</span>
                            <Badge variant={integration.is_active ? "default" : "secondary"}>
                              {integration.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{integration.provider}</p>
                          {(integration.config as Record<string, string>)?.api_key && (
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {showSecrets[integration.id] 
                                  ? (integration.config as Record<string, string>).api_key 
                                  : "••••••••••••"}
                              </code>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => setShowSecrets({ ...showSecrets, [integration.id]: !showSecrets[integration.id] })}
                              >
                                {showSecrets[integration.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => copyToClipboard((integration.config as Record<string, string>).api_key)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={integration.is_active}
                            onCheckedChange={(checked) => toggleIntegration(integration.id, checked)}
                          />
                          <Button variant="ghost" size="icon" onClick={() => openIntegrationDialog(integration)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: "integration", id: integration.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Webhook Dialog */}
      <Dialog open={webhookDialog} onOpenChange={setWebhookDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWebhook ? "Edit Webhook" : "Add Webhook"}</DialogTitle>
            <DialogDescription>Configure webhook endpoint and events</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={webhookForm.name}
                onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                placeholder="My Webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={webhookForm.url}
                onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>Secret (optional)</Label>
              <Input
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                placeholder="webhook_secret_key"
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <div key={event.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={event.value}
                      checked={webhookForm.events.includes(event.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setWebhookForm({ ...webhookForm, events: [...webhookForm.events, event.value] });
                        } else {
                          setWebhookForm({ ...webhookForm, events: webhookForm.events.filter(e => e !== event.value) });
                        }
                      }}
                    />
                    <Label htmlFor={event.value} className="text-sm">{event.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookDialog(false)}>Cancel</Button>
            <Button onClick={saveWebhook}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Integration Dialog */}
      <Dialog open={integrationDialog} onOpenChange={setIntegrationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIntegration ? "Edit Integration" : "Add Integration"}</DialogTitle>
            <DialogDescription>Configure external API integration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={integrationForm.name}
                onChange={(e) => setIntegrationForm({ ...integrationForm, name: e.target.value })}
                placeholder="My Integration"
              />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={integrationForm.provider}
                onValueChange={(value) => setIntegrationForm({ ...integrationForm, provider: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mailchimp">Mailchimp</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="zapier">Zapier</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="analytics">Google Analytics</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={integrationForm.apiKey}
                onChange={(e) => setIntegrationForm({ ...integrationForm, apiKey: e.target.value })}
                placeholder="Enter API key"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntegrationDialog(false)}>Cancel</Button>
            <Button onClick={saveIntegration}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog?.type === "webhook" ? "Webhook" : "Integration"}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminAPI;
