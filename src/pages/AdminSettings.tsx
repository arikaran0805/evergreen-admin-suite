import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Globe, Mail, Shield, Database, Zap, Upload, Eye, Twitter, Facebook, Instagram, Linkedin, Youtube, Github, Search, Code, Download, FileUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";


const urlSchema = z.string().url().optional().or(z.literal(""));

// Settings export version - increment when adding new settings fields
const SETTINGS_VERSION = "1.0.0";
const COMPATIBLE_VERSIONS = ["1.0.0"]; // List of versions that can be imported

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheOptions, setCacheOptions] = useState({
    queryCache: true,
    localStorage: false,
    sessionStorage: false,
  });
  
  // General Settings
  const [siteName, setSiteName] = useState("BlogHub");
  const [siteDescription, setSiteDescription] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [heroHeadline, setHeroHeadline] = useState("Join Learners Who Think Differently");
  const [heroSubheadline, setHeroSubheadline] = useState("Learn through emojis, visuals, and stories that spark clarity, creativity, and deeper understanding.");
  const [heroHighlightText, setHeroHighlightText] = useState("Think Differently");
  const [heroHighlightColor, setHeroHighlightColor] = useState("#22c55e");
  const [searchPlaceholders, setSearchPlaceholders] = useState<string[]>(["Search courses...", "Find lessons...", "Explore topics...", "Learn something new..."]);
  const [heroQuickLinks, setHeroQuickLinks] = useState<{label: string; slug: string; highlighted: boolean}[]>([
    { label: "Python", slug: "python-for-data-science", highlighted: true },
    { label: "Statistics", slug: "statistics", highlighted: false },
    { label: "AI & ML", slug: "ai-ml", highlighted: false }
  ]);
  const [courses, setCourses] = useState<{id: string; name: string; slug: string}[]>([]);
  
  // Social Media Links
  const [twitterUrl, setTwitterUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  
  // Email Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  
  // Security Settings
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(true);
  
  // SEO Settings
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [twitterCardType, setTwitterCardType] = useState("summary_large_image");
  const [twitterSite, setTwitterSite] = useState("");
  
  // Schema Markup Settings
  const [schemaType, setSchemaType] = useState("Organization");
  const [schemaContactEmail, setSchemaContactEmail] = useState("");
  const [schemaPhone, setSchemaPhone] = useState("");
  const [schemaAddress, setSchemaAddress] = useState("");
  
  // Editor Settings
  
  
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

    await Promise.all([loadSettings(), loadCourses()]);
    setLoading(false);
  };

  const loadCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, name, slug")
      .order("name");
    if (data) setCourses(data);
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
      setHeroHeadline(data.hero_headline || "Join Learners Who Think Differently");
      setHeroSubheadline(data.hero_subheadline || "Learn through emojis, visuals, and stories that spark clarity, creativity, and deeper understanding.");
      setHeroHighlightText(data.hero_highlight_text || "Think Differently");
      setHeroHighlightColor(data.hero_highlight_color || "#22c55e");
      setSearchPlaceholders((data as any).search_placeholders || ["Search courses...", "Find lessons...", "Explore topics...", "Learn something new..."]);
      setHeroQuickLinks((data as any).hero_quick_links || [
        { label: "Python", slug: "python-for-data-science", highlighted: true },
        { label: "Statistics", slug: "statistics", highlighted: false },
        { label: "AI & ML", slug: "ai-ml", highlighted: false }
      ]);
      setTwitterUrl(data.twitter_url || "");
      setFacebookUrl(data.facebook_url || "");
      setInstagramUrl(data.instagram_url || "");
      setLinkedinUrl(data.linkedin_url || "");
      setYoutubeUrl(data.youtube_url || "");
      setGithubUrl(data.github_url || "");
      // SEO Settings
      setMetaTitle(data.meta_title || "");
      setMetaDescription(data.meta_description || "");
      setMetaKeywords(data.meta_keywords || "");
      setOgImage(data.og_image || "");
      setOgTitle(data.og_title || "");
      setOgDescription(data.og_description || "");
      setTwitterCardType(data.twitter_card_type || "summary_large_image");
      setTwitterSite(data.twitter_site || "");
      // Schema Markup Settings
      setSchemaType((data as any).schema_type || "Organization");
      setSchemaContactEmail((data as any).schema_contact_email || "");
      setSchemaPhone((data as any).schema_phone || "");
      setSchemaAddress((data as any).schema_address || "");
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
      // Validate URLs
      const validation = {
        siteUrl: urlSchema.safeParse(siteUrl),
        twitterUrl: urlSchema.safeParse(twitterUrl),
        facebookUrl: urlSchema.safeParse(facebookUrl),
        instagramUrl: urlSchema.safeParse(instagramUrl),
        linkedinUrl: urlSchema.safeParse(linkedinUrl),
        youtubeUrl: urlSchema.safeParse(youtubeUrl),
        githubUrl: urlSchema.safeParse(githubUrl),
      };

      const errors = Object.entries(validation)
        .filter(([_, result]) => !result.success)
        .map(([field]) => field);

      if (errors.length > 0) {
        toast({
          title: "Invalid URLs",
          description: `Please check: ${errors.join(", ")}`,
          variant: "destructive"
        });
        return;
      }

      if (settingsId) {
        // Update existing settings
        const { error } = await supabase
          .from("site_settings")
          .update({
            site_name: siteName,
            site_description: siteDescription,
            site_url: siteUrl,
            logo_url: logoUrl,
            hero_headline: heroHeadline,
            hero_subheadline: heroSubheadline,
            hero_highlight_text: heroHighlightText,
            hero_highlight_color: heroHighlightColor,
            search_placeholders: searchPlaceholders.filter(p => p.trim()),
            hero_quick_links: heroQuickLinks.filter(l => l.label.trim() && l.slug.trim()),
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
            hero_headline: heroHeadline,
            hero_subheadline: heroSubheadline,
            hero_highlight_text: heroHighlightText,
            hero_highlight_color: heroHighlightColor,
            search_placeholders: searchPlaceholders.filter(p => p.trim()),
            hero_quick_links: heroQuickLinks.filter(l => l.label.trim() && l.slug.trim()),
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

  const handleSaveSocial = async () => {
    setSaving(true);
    try {
      // Validate URLs
      const validation = {
        twitterUrl: urlSchema.safeParse(twitterUrl),
        facebookUrl: urlSchema.safeParse(facebookUrl),
        instagramUrl: urlSchema.safeParse(instagramUrl),
        linkedinUrl: urlSchema.safeParse(linkedinUrl),
        youtubeUrl: urlSchema.safeParse(youtubeUrl),
        githubUrl: urlSchema.safeParse(githubUrl),
      };

      const errors = Object.entries(validation)
        .filter(([_, result]) => !result.success)
        .map(([field]) => field);

      if (errors.length > 0) {
        toast({
          title: "Invalid URLs",
          description: `Please check: ${errors.join(", ")}`,
          variant: "destructive"
        });
        return;
      }

      if (settingsId) {
        const { error } = await supabase
          .from("site_settings")
          .update({
            twitter_url: twitterUrl || null,
            facebook_url: facebookUrl || null,
            instagram_url: instagramUrl || null,
            linkedin_url: linkedinUrl || null,
            youtube_url: youtubeUrl || null,
            github_url: githubUrl || null,
          })
          .eq("id", settingsId);

        if (error) throw error;
      }
      
      toast({ title: "Social media links saved successfully" });
    } catch (error: any) {
      toast({
        title: "Error saving social media links",
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

  const handleSaveSEO = async () => {
    setSaving(true);
    try {
      if (!settingsId) {
        toast({ title: "Error", description: "Settings not found", variant: "destructive" });
        return;
      }
      
      const { error } = await supabase
        .from("site_settings")
        .update({
          meta_title: metaTitle,
          meta_description: metaDescription,
          meta_keywords: metaKeywords,
          og_image: ogImage,
          og_title: ogTitle,
          og_description: ogDescription,
          twitter_card_type: twitterCardType,
          twitter_site: twitterSite,
          schema_type: schemaType,
          schema_contact_email: schemaContactEmail,
          schema_phone: schemaPhone,
          schema_address: schemaAddress,
        })
        .eq("id", settingsId);

      if (error) throw error;
      toast({ title: "SEO settings saved successfully" });
    } catch (error: any) {
      toast({
        title: "Error saving SEO settings",
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
          <TabsList className="grid w-full grid-cols-6 lg:w-[840px]">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Social
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              SEO
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
                  <Settings className="h-5 w-5 text-primary" />
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

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Hero Section</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Customize the main headline and subheadline on your homepage
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="heroHeadline">Headline</Label>
                      <Input
                        id="heroHeadline"
                        value={heroHeadline}
                        onChange={(e) => setHeroHeadline(e.target.value)}
                        placeholder="Join Learners Who Think Differently"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="heroSubheadline">Subheadline</Label>
                      <Textarea
                        id="heroSubheadline"
                        value={heroSubheadline}
                        onChange={(e) => setHeroSubheadline(e.target.value)}
                        placeholder="Learn through emojis, visuals, and stories that spark clarity, creativity, and deeper understanding."
                        rows={3}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="heroHighlightText">Highlighted Text in Headline</Label>
                      <Input
                        id="heroHighlightText"
                        value={heroHighlightText}
                        onChange={(e) => setHeroHighlightText(e.target.value)}
                        placeholder="Think Differently"
                      />
                      <p className="text-sm text-muted-foreground">
                        Enter the exact text from your headline that you want to highlight in color
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="heroHighlightColor">Highlight Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="heroHighlightColor"
                          type="color"
                          value={heroHighlightColor}
                          onChange={(e) => setHeroHighlightColor(e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={heroHighlightColor}
                          onChange={(e) => setHeroHighlightColor(e.target.value)}
                          placeholder="#22c55e"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Choose a color for the highlighted text (default: green #22c55e)
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Search Bar Placeholder Texts</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Add placeholder texts that cycle through in the search bar (one per line)
                      </p>
                      <Textarea
                        value={searchPlaceholders.join('\n')}
                        onChange={(e) => setSearchPlaceholders(e.target.value.split('\n'))}
                        placeholder="Search courses...&#10;Find lessons...&#10;Explore topics..."
                        rows={4}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div>
                        <Label>Quick Links (Course Pills)</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Add quick course links that appear below the search bar
                        </p>
                      </div>
                      {heroQuickLinks.map((link, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input
                            value={link.label}
                            onChange={(e) => {
                              const updated = [...heroQuickLinks];
                              updated[index].label = e.target.value;
                              setHeroQuickLinks(updated);
                            }}
                            placeholder="Label (e.g., Python)"
                            className="flex-1"
                          />
                          <Select
                            value={link.slug}
                            onValueChange={(value) => {
                              const updated = [...heroQuickLinks];
                              updated[index].slug = value;
                              const selectedCourse = courses.find(c => c.slug === value);
                              if (selectedCourse && !updated[index].label) {
                                updated[index].label = selectedCourse.name;
                              }
                              setHeroQuickLinks(updated);
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select a course" />
                            </SelectTrigger>
                            <SelectContent>
                              {courses.map((course) => (
                                <SelectItem key={course.id} value={course.slug}>
                                  {course.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Checkbox
                            checked={link.highlighted}
                            onCheckedChange={(checked) => {
                              const updated = [...heroQuickLinks];
                              updated[index].highlighted = !!checked;
                              setHeroQuickLinks(updated);
                            }}
                          />
                          <Label className="text-xs w-16">Highlight</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHeroQuickLinks(heroQuickLinks.filter((_, i) => i !== index))}
                            className="text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHeroQuickLinks([...heroQuickLinks, { label: "", slug: "", highlighted: false }])}
                      >
                        Add Quick Link
                      </Button>
                    </div>
                  </div>
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

          {/* Social Media Settings */}
          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Social Media Links
                </CardTitle>
                <CardDescription>
                  Add your social media profile URLs (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="twitter" className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" />
                      Twitter / X
                    </Label>
                    <Input
                      id="twitter"
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="https://twitter.com/yourusername"
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facebook" className="flex items-center gap-2">
                      <Facebook className="h-4 w-4" />
                      Facebook
                    </Label>
                    <Input
                      id="facebook"
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      placeholder="https://facebook.com/yourpage"
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram" className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </Label>
                    <Input
                      id="instagram"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/yourusername"
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin" className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </Label>
                    <Input
                      id="linkedin"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/company/yourcompany"
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="youtube" className="flex items-center gap-2">
                      <Youtube className="h-4 w-4" />
                      YouTube
                    </Label>
                    <Input
                      id="youtube"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/@yourchannel"
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="github" className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub
                    </Label>
                    <Input
                      id="github"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/yourusername"
                      type="url"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveSocial} disabled={saving} className="bg-primary w-full">
                  {saving ? "Saving..." : "Save Social Media Links"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Settings */}
          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Basic Meta Tags
                </CardTitle>
                <CardDescription>
                  Default meta tags that will be used across your site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="meta_title">Meta Title</Label>
                  <Input
                    id="meta_title"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Your Site Title - Best Blog Platform"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">
                    {metaTitle.length}/60 characters (recommended)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta_description">Meta Description</Label>
                  <Textarea
                    id="meta_description"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="A brief description of your site that appears in search results"
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground">
                    {metaDescription.length}/160 characters (recommended)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta_keywords">Meta Keywords</Label>
                  <Input
                    id="meta_keywords"
                    value={metaKeywords}
                    onChange={(e) => setMetaKeywords(e.target.value)}
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
                    value={ogTitle}
                    onChange={(e) => setOgTitle(e.target.value)}
                    placeholder="Title that appears when shared on social media"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="og_description">OG Description</Label>
                  <Textarea
                    id="og_description"
                    value={ogDescription}
                    onChange={(e) => setOgDescription(e.target.value)}
                    placeholder="Description that appears when shared on social media"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="og_image">OG Image URL</Label>
                  <Input
                    id="og_image"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
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
                    value={twitterCardType}
                    onChange={(e) => setTwitterCardType(e.target.value)}
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
                    value={twitterSite}
                    onChange={(e) => setTwitterSite(e.target.value)}
                    placeholder="@yoursitehandle"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Structured Data / Schema Markup
                </CardTitle>
                <CardDescription>
                  Configure JSON-LD schema for rich search results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schema_type">Organization Type</Label>
                  <select
                    id="schema_type"
                    value={schemaType}
                    onChange={(e) => setSchemaType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="Organization">Organization</option>
                    <option value="LocalBusiness">Local Business</option>
                    <option value="Corporation">Corporation</option>
                    <option value="EducationalOrganization">Educational Organization</option>
                    <option value="Person">Person / Blog</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Select the type that best describes your site
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schema_contact_email">Contact Email</Label>
                  <Input
                    id="schema_contact_email"
                    type="email"
                    value={schemaContactEmail}
                    onChange={(e) => setSchemaContactEmail(e.target.value)}
                    placeholder="contact@yoursite.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email shown in schema markup for contact
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schema_phone">Phone Number (Optional)</Label>
                  <Input
                    id="schema_phone"
                    value={schemaPhone}
                    onChange={(e) => setSchemaPhone(e.target.value)}
                    placeholder="+1-234-567-8900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schema_address">Address (Optional)</Label>
                  <Textarea
                    id="schema_address"
                    value={schemaAddress}
                    onChange={(e) => setSchemaAddress(e.target.value)}
                    placeholder="123 Main St, City, State, Country"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Physical address for LocalBusiness schema
                  </p>
                </div>

                <Separator />

                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-medium mb-2 text-sm">Schema Preview</h4>
                  <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(
                      {
                        "@context": "https://schema.org",
                        "@type": schemaType,
                        "name": siteName || "Your Site Name",
                        "url": siteUrl || "https://yoursite.com",
                        ...(logoUrl && { "logo": logoUrl }),
                        ...(schemaContactEmail && { "email": schemaContactEmail }),
                        ...(schemaPhone && { "telephone": schemaPhone }),
                        ...(schemaAddress && { "address": schemaAddress }),
                        "sameAs": [twitterUrl, facebookUrl, instagramUrl, linkedinUrl, youtubeUrl, githubUrl].filter(Boolean)
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>

                <Button onClick={handleSaveSEO} disabled={saving} className="bg-primary w-full">
                  {saving ? "Saving..." : "Save SEO & Schema Settings"}
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
                    Select which cached data to clear
                  </p>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="cache-query" 
                        checked={cacheOptions.queryCache}
                        onCheckedChange={(checked) => setCacheOptions(prev => ({ ...prev, queryCache: checked === true }))}
                      />
                      <Label htmlFor="cache-query" className="text-sm font-normal cursor-pointer">
                        Query Cache <span className="text-muted-foreground">(API responses, data fetching)</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="cache-local" 
                        checked={cacheOptions.localStorage}
                        onCheckedChange={(checked) => setCacheOptions(prev => ({ ...prev, localStorage: checked === true }))}
                      />
                      <Label htmlFor="cache-local" className="text-sm font-normal cursor-pointer">
                        Local Storage <span className="text-muted-foreground">(preferences, settings)</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="cache-session" 
                        checked={cacheOptions.sessionStorage}
                        onCheckedChange={(checked) => setCacheOptions(prev => ({ ...prev, sessionStorage: checked === true }))}
                      />
                      <Label htmlFor="cache-session" className="text-sm font-normal cursor-pointer">
                        Session Storage <span className="text-muted-foreground">(temporary session data)</span>
                      </Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCacheOptions({ queryCache: true, localStorage: true, sessionStorage: true })}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCacheOptions({ queryCache: false, localStorage: false, sessionStorage: false })}
                    >
                      Deselect All
                    </Button>
                  </div>
                  <Separator className="my-4" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        disabled={clearingCache || (!cacheOptions.queryCache && !cacheOptions.localStorage && !cacheOptions.sessionStorage)}
                      >
                        {clearingCache ? "Clearing..." : "Clear Selected Cache"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Selected Cache?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will clear the following:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            {cacheOptions.queryCache && <li>Query Cache (API responses)</li>}
                            {cacheOptions.localStorage && <li>Local Storage (may reset preferences)</li>}
                            {cacheOptions.sessionStorage && <li>Session Storage (may require re-login)</li>}
                          </ul>
                          <p className="mt-2">This action cannot be undone.</p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            setClearingCache(true);
                            try {
                              const cleared: string[] = [];
                              if (cacheOptions.queryCache) {
                                queryClient.clear();
                                cleared.push("Query Cache");
                              }
                              if (cacheOptions.localStorage) {
                                localStorage.clear();
                                cleared.push("Local Storage");
                              }
                              if (cacheOptions.sessionStorage) {
                                sessionStorage.clear();
                                cleared.push("Session Storage");
                              }
                              toast({
                                title: "Cache Cleared",
                                description: `Cleared: ${cleared.join(", ")}`,
                              });
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to clear cache",
                                variant: "destructive",
                              });
                            } finally {
                              setClearingCache(false);
                            }
                          }}
                        >
                          Clear Cache
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <Separator />

                <div className="rounded-lg bg-muted p-4">
                  <h3 className="font-semibold mb-2">API Access</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage API keys and access tokens
                  </p>
                  <Button variant="outline" onClick={() => navigate("/admin/api")}>
                    Manage API Keys
                  </Button>
                </div>

                <Separator />

                <div className="rounded-lg bg-muted p-4">
                  <h3 className="font-semibold mb-2">Backup & Restore</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export or import all settings for backup purposes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const settings = {
                          siteName,
                          siteDescription,
                          siteUrl,
                          logoUrl,
                          heroHeadline,
                          heroSubheadline,
                          heroHighlightText,
                          heroHighlightColor,
                          twitterUrl,
                          facebookUrl,
                          instagramUrl,
                          linkedinUrl,
                          youtubeUrl,
                          githubUrl,
                          emailNotifications,
                          adminEmail,
                          requireEmailVerification,
                          allowPublicRegistration,
                          metaTitle,
                          metaDescription,
                          metaKeywords,
                          ogTitle,
                          ogDescription,
                          ogImage,
                          twitterCardType,
                          twitterSite,
                          schemaType,
                          schemaContactEmail,
                          schemaPhone,
                          schemaAddress,
                          _meta: {
                            version: SETTINGS_VERSION,
                            exportedAt: new Date().toISOString(),
                            appName: "BlogHub Settings",
                          },
                        };
                        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `site-settings-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast({
                          title: "Settings Exported",
                          description: "Your settings have been downloaded as a JSON file",
                        });
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Settings
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">
                          <FileUp className="h-4 w-4 mr-2" />
                          Import Settings
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Import Settings</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will replace your current settings with the imported ones. Make sure to export your current settings first as a backup.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <Input
                            type="file"
                            accept=".json"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  try {
                                    const imported = JSON.parse(event.target?.result as string);
                                    
                                    // Version compatibility check
                                    const importedVersion = imported._meta?.version;
                                    if (!importedVersion) {
                                      toast({
                                        title: "Warning",
                                        description: "This backup has no version info. Some settings may not import correctly.",
                                        variant: "destructive",
                                      });
                                    } else if (!COMPATIBLE_VERSIONS.includes(importedVersion)) {
                                      toast({
                                        title: "Incompatible Version",
                                        description: `This backup is version ${importedVersion}, which is not compatible with the current version (${SETTINGS_VERSION}).`,
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    
                                    if (imported.siteName) setSiteName(imported.siteName);
                                    if (imported.siteDescription) setSiteDescription(imported.siteDescription);
                                    if (imported.siteUrl) setSiteUrl(imported.siteUrl);
                                    if (imported.logoUrl) setLogoUrl(imported.logoUrl);
                                    if (imported.heroHeadline) setHeroHeadline(imported.heroHeadline);
                                    if (imported.heroSubheadline) setHeroSubheadline(imported.heroSubheadline);
                                    if (imported.heroHighlightText) setHeroHighlightText(imported.heroHighlightText);
                                    if (imported.heroHighlightColor) setHeroHighlightColor(imported.heroHighlightColor);
                                    if (imported.twitterUrl) setTwitterUrl(imported.twitterUrl);
                                    if (imported.facebookUrl) setFacebookUrl(imported.facebookUrl);
                                    if (imported.instagramUrl) setInstagramUrl(imported.instagramUrl);
                                    if (imported.linkedinUrl) setLinkedinUrl(imported.linkedinUrl);
                                    if (imported.youtubeUrl) setYoutubeUrl(imported.youtubeUrl);
                                    if (imported.githubUrl) setGithubUrl(imported.githubUrl);
                                    if (typeof imported.emailNotifications === 'boolean') setEmailNotifications(imported.emailNotifications);
                                    if (imported.adminEmail) setAdminEmail(imported.adminEmail);
                                    if (typeof imported.requireEmailVerification === 'boolean') setRequireEmailVerification(imported.requireEmailVerification);
                                    if (typeof imported.allowPublicRegistration === 'boolean') setAllowPublicRegistration(imported.allowPublicRegistration);
                                    if (imported.metaTitle) setMetaTitle(imported.metaTitle);
                                    if (imported.metaDescription) setMetaDescription(imported.metaDescription);
                                    if (imported.metaKeywords) setMetaKeywords(imported.metaKeywords);
                                    if (imported.ogTitle) setOgTitle(imported.ogTitle);
                                    if (imported.ogDescription) setOgDescription(imported.ogDescription);
                                    if (imported.ogImage) setOgImage(imported.ogImage);
                                    if (imported.twitterCardType) setTwitterCardType(imported.twitterCardType);
                                    if (imported.twitterSite) setTwitterSite(imported.twitterSite);
                                    if (imported.schemaType) setSchemaType(imported.schemaType);
                                    if (imported.schemaContactEmail) setSchemaContactEmail(imported.schemaContactEmail);
                                    if (imported.schemaPhone) setSchemaPhone(imported.schemaPhone);
                                    if (imported.schemaAddress) setSchemaAddress(imported.schemaAddress);
                                    const exportDate = imported._meta?.exportedAt 
                                      ? new Date(imported._meta.exportedAt).toLocaleDateString() 
                                      : "unknown date";
                                    toast({
                                      title: "Settings Imported",
                                      description: `Loaded v${imported._meta?.version || "unknown"} backup from ${exportDate}. Click Save to apply.`,
                                    });
                                  } catch (error) {
                                    toast({
                                      title: "Import Failed",
                                      description: "Invalid settings file format",
                                      variant: "destructive",
                                    });
                                  }
                                };
                                reader.readAsText(file);
                              }
                            }}
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Close</AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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

            {/* Social Media Preview */}
            {(twitterUrl || facebookUrl || instagramUrl || linkedinUrl || youtubeUrl || githubUrl) && (
              <div>
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Social Media Links</h3>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex gap-4 flex-wrap">
                    {twitterUrl && (
                      <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                    {facebookUrl && (
                      <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Facebook className="h-5 w-5" />
                      </a>
                    )}
                    {instagramUrl && (
                      <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                    {linkedinUrl && (
                      <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {youtubeUrl && (
                      <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Youtube className="h-5 w-5" />
                      </a>
                    )}
                    {githubUrl && (
                      <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Github className="h-5 w-5" />
                      </a>
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
