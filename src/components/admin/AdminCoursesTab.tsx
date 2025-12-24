import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Trash2, Star, Eye, Info, User, UserCog, Shield } from "lucide-react";
import { format } from "date-fns";
import { ContentStatusBadge, ContentStatus } from "@/components/ContentStatusBadge";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured: boolean;
  level: string | null;
  created_at: string;
  status: string;
  author_id: string | null;
  assigned_to: string | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

interface UserWithRole {
  profile: UserProfile;
  role: string;
}

interface CategoryStats {
  [categoryId: string]: {
    postCount: number;
  };
}

const AdminCoursesTab = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({});
  const [users, setUsers] = useState<Map<string, UserWithRole>>(new Map());
  const [loading, setLoading] = useState(true);
  const [previewCategory, setPreviewCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, userId } = useUserRole();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories((data as Category[]) || []);
      
      if (data && data.length > 0) {
        await fetchCategoryStats(data.map(c => c.id));
        
        // Collect all unique user IDs (authors and assignees)
        const userIds = new Set<string>();
        data.forEach(c => {
          if (c.author_id) userIds.add(c.author_id);
          if (c.assigned_to) userIds.add(c.assigned_to);
        });
        
        if (userIds.size > 0) {
          await fetchUsers(Array.from(userIds));
        }
      }
    } catch (error: any) {
      toast({ title: "Error fetching courses", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (userIds: string[]) => {
    try {
      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      // Fetch roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const userMap = new Map<string, UserWithRole>();
      
      profiles?.forEach(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        userMap.set(profile.id, {
          profile,
          role: userRole?.role || "user"
        });
      });

      setUsers(userMap);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchCategoryStats = async (categoryIds: string[]) => {
    try {
      const statsMap: CategoryStats = {};
      categoryIds.forEach(id => {
        statsMap[id] = { postCount: 0 };
      });

      const { data: postsData } = await supabase
        .from("posts")
        .select("category_id")
        .in("category_id", categoryIds);

      if (postsData) {
        postsData.forEach(post => {
          if (post.category_id && statsMap[post.category_id]) {
            statsMap[post.category_id].postCount++;
          }
        });
      }

      setCategoryStats(statsMap);
    } catch (error) {
      console.error("Error fetching category stats:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Course deleted successfully" });
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Error deleting course", description: error.message, variant: "destructive" });
    }
  };

  const toggleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({ featured: !currentFeatured })
        .eq("id", id);
      
      if (error) throw error;
      toast({ title: `Course ${!currentFeatured ? "marked as featured" : "unmarked as featured"}` });
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Error updating featured status", description: error.message, variant: "destructive" });
    }
  };

  const getUserDisplay = (userId: string | null) => {
    if (!userId) return null;
    const user = users.get(userId);
    if (!user) return { name: "Unknown", role: "user" };
    return {
      name: user.profile.full_name || user.profile.email.split("@")[0],
      role: user.role
    };
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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => navigate("/admin/courses/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Course
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const author = getUserDisplay(category.author_id);
          const assignee = getUserDisplay(category.assigned_to);
          
          return (
            <Card key={category.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{category.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">/{category.slug}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(`/course/${category.slug}`, "_blank")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => navigate(`/admin/courses/${category.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="mt-2">
                  <ContentStatusBadge status={category.status as ContentStatus} />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 pt-2">
                {/* Ownership Info */}
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg text-sm">
                  {author && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Created by
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate max-w-[100px]">{author.name}</span>
                        {getRoleBadge(author.role)}
                      </div>
                    </div>
                  )}
                  
                  {assignee && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <UserCog className="h-3 w-3" />
                        Assigned to
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate max-w-[100px]">{assignee.name}</span>
                        {getRoleBadge(assignee.role)}
                      </div>
                    </div>
                  )}
                </div>

                {category.description && (
                  <div>
                    <div 
                      className="text-sm break-words prose prose-sm max-w-none line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: category.description }}
                    />
                    {category.description.length > 100 && (
                      <button
                        onClick={() => setPreviewCategory(category)}
                        className="text-xs text-primary hover:underline mt-1"
                      >
                        Read more
                      </button>
                    )}
                  </div>
                )}
                
                {category.level && (
                  <p className="text-sm text-muted-foreground">Level: {category.level}</p>
                )}
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Info className="h-3 w-3" />
                          <span>{categoryStats[category.id]?.postCount || 0} posts</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="p-2">
                        <span className="text-xs">Created: {format(new Date(category.created_at), "MMM d, yyyy")}</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Star className={`h-4 w-4 ${category.featured ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      <Switch
                        checked={category.featured}
                        onCheckedChange={() => toggleFeatured(category.id, category.featured)}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!previewCategory} onOpenChange={() => setPreviewCategory(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{previewCategory?.name}</DialogTitle>
            {previewCategory?.level && (
              <p className="text-sm text-muted-foreground">Level: {previewCategory.level}</p>
            )}
          </DialogHeader>
          {previewCategory?.description && (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewCategory.description }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoursesTab;