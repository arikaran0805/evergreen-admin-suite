import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Plus, 
  Eye, 
  Pencil, 
  Trash2, 
  Info,
  FileText,
  Send,
  Shield,
  UserCog
} from "lucide-react";
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
  const { isAdmin, isModerator, userId } = useUserRole();

  useEffect(() => {
    fetchCategories();
  }, [userId, isAdmin, isModerator]);

  const fetchCategories = async () => {
    try {
      let query = supabase
        .from("courses")
        .select("*")
        .order("name", { ascending: true });

      // Moderators only see their own courses or assigned courses
      if (isModerator && !isAdmin && userId) {
        query = query.or(`author_id.eq.${userId},assigned_to.eq.${userId}`);
      }

      const { data, error } = await query;

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
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

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

  const handleDeleteRequest = async (course: Category) => {
    toast({ title: `Delete request sent for "${course.name}"` });
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
        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1 ml-1">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    if (role === "moderator") {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1 ml-1">
          <UserCog className="h-3 w-3" />
          Mod
        </Badge>
      );
    }
    return null;
  };

  const getLevelBadge = (level: string | null) => {
    if (!level) return <span className="text-muted-foreground text-sm">-</span>;
    
    const colors: Record<string, string> = {
      beginner: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      intermediate: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      advanced: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    };
    
    return (
      <Badge className={colors[level.toLowerCase()] || "bg-muted text-muted-foreground"}>
        {level}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">All Courses</h2>
            <p className="text-sm text-muted-foreground">
              {categories.length} course{categories.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <Button onClick={() => navigate("/admin/courses/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Course
          </Button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No courses found</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Assigned To</TableHead>
                  {isModerator && !isAdmin && <TableHead>Status</TableHead>}
                  <TableHead>Level</TableHead>
                  <TableHead className="text-center">Info</TableHead>
                  <TableHead className="text-center">Posts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const author = getUserDisplay(category.author_id);
                  const assignee = getUserDisplay(category.assigned_to);
                  
                  return (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {category.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        {author ? (
                          <div className="flex items-center flex-wrap gap-1">
                            <span className="text-sm">{author.name}</span>
                            {getRoleBadge(author.role)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignee ? (
                          <div className="flex items-center flex-wrap gap-1">
                            <span className="text-sm">{assignee.name}</span>
                            {getRoleBadge(assignee.role)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      {isModerator && !isAdmin && (
                        <TableCell>
                          <ContentStatusBadge status={category.status as ContentStatus} />
                        </TableCell>
                      )}
                      <TableCell>{getLevelBadge(category.level)}</TableCell>
                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setPreviewCategory(category)}
                            >
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View details</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">
                          {categoryStats[category.id]?.postCount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(`/courses/${category.slug}`, "_blank")}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Preview</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => navigate(`/admin/courses/${category.id}`)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          
                          {isAdmin ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(category.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-orange-500 hover:text-orange-600"
                                  onClick={() => handleDeleteRequest(category)}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Request Delete</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Info Dialog */}
        <Dialog open={!!previewCategory} onOpenChange={() => setPreviewCategory(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{previewCategory?.name}</DialogTitle>
              <DialogDescription>Course Details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Slug:</span>
                  <p className="font-mono mt-1">{previewCategory?.slug}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Level:</span>
                  <p className="mt-1">{previewCategory?.level || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="mt-1">{previewCategory?.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Posts:</span>
                  <p className="mt-1">{previewCategory ? categoryStats[previewCategory.id]?.postCount || 0 : 0}</p>
                </div>
              </div>
              {previewCategory?.description && (
                <div>
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <div 
                    className="mt-1 text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewCategory.description }}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default AdminCoursesTab;
