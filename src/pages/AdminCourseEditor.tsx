import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import AdminLayout from "@/components/AdminLayout";
import { AdminEditorSkeleton } from "@/components/admin/AdminEditorSkeleton";
import { ContentStatusBadge, ContentStatus } from "@/components/ContentStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextEditor from "@/components/RichTextEditor";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X, Image, icons, Save, Send, User, UserCog, Shield, Users } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

interface UserWithRole extends UserProfile {
  role: string;
}

const AdminCourseEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isModerator, userId, isLoading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(!!id);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [difficultyLevels, setDifficultyLevels] = useState<{ id: string; name: string }[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<UserWithRole[]>([]);
  const [authorInfo, setAuthorInfo] = useState<UserWithRole | null>(null);
  const [assigneeInfo, setAssigneeInfo] = useState<UserWithRole | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    featured: false,
    level: "Beginner",
    featured_image: "",
    icon: "BookOpen",
    learning_hours: 0,
    status: "draft" as string,
    assigned_to: "" as string,
  });
  const [originalAuthorId, setOriginalAuthorId] = useState<string | null>(null);

  // Get a list of popular icons for courses
  const courseIcons = [
    "BookOpen", "Code", "Database", "Brain", "Cpu", "Globe", "Layers",
    "LineChart", "Palette", "Rocket", "Server", "Terminal", "Wrench", 
    "Zap", "BarChart", "Cloud", "FileCode", "GitBranch", "Lock", "Monitor"
  ];

  useEffect(() => {
    if (!roleLoading) {
      checkAccess();
    }
  }, [roleLoading]);

  useEffect(() => {
    if (!roleLoading && (isAdmin || isModerator)) {
      const loadData = async () => {
        const promises: Promise<void>[] = [fetchDifficultyLevels()];
        
        if (isAdmin) {
          promises.push(fetchAssignableUsers());
        }
        
        if (id) {
          promises.push(fetchCategory());
        }
        
        await Promise.all(promises);
        
        // Only set loading to false for new courses (edit loading handled in fetchCategory)
        if (!id) {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [id, isAdmin, isModerator, roleLoading]);

  const fetchDifficultyLevels = async () => {
    try {
      const { data, error } = await supabase
        .from("difficulty_levels")
        .select("id, name")
        .order("display_order");

      if (error) throw error;
      setDifficultyLevels(data || []);
    } catch (error: any) {
      toast({ title: "Error fetching difficulty levels", description: error.message, variant: "destructive" });
    }
  };

  const fetchAssignableUsers = async () => {
    try {
      // Get all admins and moderators
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "moderator"]);

      if (rolesError) throw rolesError;

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
          const roleInfo = rolesData.find(r => r.user_id === profile.id);
          return {
            ...profile,
            role: roleInfo?.role || "user"
          };
        });

        setAssignableUsers(usersWithRoles);
      }
    } catch (error: any) {
      console.error("Error fetching assignable users:", error);
    }
  };

  const fetchUserInfo = async (userId: string): Promise<UserWithRole | null> => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", userId)
        .single();

      if (!profile) return null;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      return {
        ...profile,
        role: roleData?.role || "user"
      };
    } catch {
      return null;
    }
  };

  const checkAccess = async () => {
    if (!isAdmin && !isModerator) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }
  };

  const fetchCategory = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      if (data) {
        // Check if moderator is trying to edit someone else's course (and it's not assigned to them)
        if (isModerator && !isAdmin && data.author_id && data.author_id !== userId && data.assigned_to !== userId) {
          toast({
            title: "Access Denied",
            description: "You can only edit your own or assigned courses",
            variant: "destructive",
          });
          navigate("/admin/courses");
          return;
        }

        setOriginalAuthorId(data.author_id);
        setFormData({
          name: data.name,
          slug: data.slug,
          description: data.description || "",
          featured: data.featured || false,
          level: data.level || "Beginner",
          featured_image: data.featured_image || "",
          icon: (data as any).icon || "BookOpen",
          learning_hours: (data as any).learning_hours || 0,
          status: data.status || "draft",
          assigned_to: (data as any).assigned_to || "",
        });

        // Fetch author info
        if (data.author_id) {
          const author = await fetchUserInfo(data.author_id);
          setAuthorInfo(author);
        }

        // Fetch assignee info
        if ((data as any).assigned_to) {
          const assignee = await fetchUserInfo((data as any).assigned_to);
          setAssigneeInfo(assignee);
        }
      }
    } catch (error: any) {
      toast({ title: "Error fetching course", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, submitForApproval: boolean = false) => {
    e.preventDefault();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Determine status - Moderators can only create drafts or submit for approval
      let status = formData.status;
      if (isModerator && !isAdmin) {
        // Moderators can only set draft or pending status
        if (submitForApproval) {
          status = "pending";
        } else {
          status = "draft";
        }
      } else if (submitForApproval) {
        status = "pending";
      }

      const courseData: any = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        featured: formData.featured,
        level: formData.level,
        featured_image: formData.featured_image || null,
        icon: formData.icon,
        learning_hours: formData.learning_hours,
        status,
        author_id: originalAuthorId || session.user.id,
      };

      // Only admins can set assigned_to
      if (isAdmin) {
        courseData.assigned_to = formData.assigned_to || null;
      }

      let courseId = id;

      if (id) {
        const { error } = await supabase
          .from("courses")
          .update(courseData)
          .eq("id", id);
        
        if (error) throw error;
        toast({ title: "Course updated successfully" });
      } else {
        const { data: newCourse, error } = await supabase
          .from("courses")
          .insert([courseData])
          .select()
          .single();
        
        if (error) throw error;
        courseId = newCourse.id;
        toast({ title: "Course created successfully" });
      }

      // Record approval history if submitting for approval
      if (submitForApproval && courseId) {
        await supabase.from("approval_history").insert({
          content_type: "course",
          content_id: courseId,
          action: "submitted",
          performed_by: session.user.id,
        });
        toast({ title: "Course submitted for approval" });
      }
      
      navigate("/admin/courses");
    } catch (error: any) {
      toast({ title: "Error saving course", description: error.message, variant: "destructive" });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `course-${Date.now()}.${fileExt}`;
      const filePath = `courses/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(filePath);

      setFormData({ ...formData, featured_image: publicUrl });
      toast({ title: "Image uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error uploading image", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, featured_image: "" });
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    if (role === "moderator") {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1">
          <UserCog className="h-3 w-3" />
          Moderator
        </Badge>
      );
    }
    return null;
  };

  const canPublishDirectly = isAdmin;
  const showSubmitForApproval = isModerator && !isAdmin;

  if (roleLoading || loading) {
    return (
      <AdminLayout>
        <AdminEditorSkeleton type="course" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/admin/courses")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {id ? "Edit Course" : "Create New Course"}
          </h1>
          {formData.status && formData.status !== "draft" && (
            <ContentStatusBadge status={formData.status as ContentStatus} />
          )}
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="grid gap-6 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Course Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter course name"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({
                        ...formData,
                        name,
                        slug: generateSlug(name),
                      });
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    placeholder="course-slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ownership & Assignment Card - Admin Only */}
            {isAdmin && id && (
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Ownership & Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Created By */}
                  {authorInfo && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Created by
                      </Label>
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                        <span className="text-sm font-medium">
                          {authorInfo.full_name || authorInfo.email.split("@")[0]}
                        </span>
                        {getRoleBadge(authorInfo.role)}
                      </div>
                    </div>
                  )}

                  {/* Assign To */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <UserCog className="h-3 w-3" />
                      Assign to
                    </Label>
                    <Select
                      value={formData.assigned_to || "none"}
                      onValueChange={(value) => setFormData({ ...formData, assigned_to: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not assigned</SelectItem>
                        {assignableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <span>{user.full_name || user.email.split("@")[0]}</span>
                              <span className="text-xs text-muted-foreground">
                                ({user.role})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Assigned users can edit this course
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Show ownership info for moderators (read-only) */}
            {!isAdmin && id && (authorInfo || assigneeInfo) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Ownership Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {authorInfo && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created by:</span>
                      <div className="flex items-center gap-2">
                        <span>{authorInfo.full_name || authorInfo.email.split("@")[0]}</span>
                        {getRoleBadge(authorInfo.role)}
                      </div>
                    </div>
                  )}
                  {assigneeInfo && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Assigned to:</span>
                      <div className="flex items-center gap-2">
                        <span>{assigneeInfo.full_name || assigneeInfo.email.split("@")[0]}</span>
                        {getRoleBadge(assigneeInfo.role)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Featured Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.featured_image ? (
                  <div className="relative">
                    <img
                      src={formData.featured_image}
                      alt="Featured"
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="h-10 w-10 mx-auto text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Click to upload image
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                {formData.featured_image && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Change Image"}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status - Only show to admins */}
                {canPublishDirectly && (
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending Approval</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="level">Difficulty Level</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => setFormData({ ...formData, level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map((level) => (
                        <SelectItem key={level.id} value={level.name}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="learning_hours">Learning Hours</Label>
                  <Input
                    id="learning_hours"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 10"
                    value={formData.learning_hours}
                    onChange={(e) => setFormData({ ...formData, learning_hours: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Estimated hours to complete</p>
                </div>

                <div className="space-y-2">
                  <Label>Course Icon</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {courseIcons.map((iconName) => {
                      const IconComponent = icons[iconName as keyof typeof icons];
                      return (
                        <Button
                          key={iconName}
                          type="button"
                          variant={formData.icon === iconName ? "default" : "outline"}
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => setFormData({ ...formData, icon: iconName })}
                        >
                          {IconComponent && <IconComponent className="h-5 w-5" />}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="featured" className="cursor-pointer">
                      Featured Course
                    </Label>
                    <Switch
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              {canPublishDirectly ? (
                <Button type="submit" className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {id ? "Update Course" : "Create Course"}
                </Button>
              ) : (
                <>
                  <Button type="submit" variant="outline" className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  {showSubmitForApproval && (
                    <Button 
                      type="button" 
                      className="w-full"
                      onClick={(e) => handleSubmit(e as any, true)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Submit for Approval
                    </Button>
                  )}
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/admin/courses")}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminCourseEditor;