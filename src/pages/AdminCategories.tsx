import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Trash2, Star, Eye, Info } from "lucide-react";
import { format } from "date-fns";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured: boolean;
  level: string | null;
  created_at: string;
}

interface CategoryStats {
  [categoryId: string]: {
    postCount: number;
  };
}

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({});
  const [loading, setLoading] = useState(true);
  const [previewCategory, setPreviewCategory] = useState<Category | null>(null);
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

    fetchCategories();
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
      
      if (data && data.length > 0) {
        await fetchCategoryStats(data.map(c => c.id));
      }
    } catch (error: any) {
      toast({ title: "Error fetching categories", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
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
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Category deleted successfully" });
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Error deleting category", description: error.message, variant: "destructive" });
    }
  };

  const toggleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ featured: !currentFeatured })
        .eq("id", id);
      
      if (error) throw error;
      toast({ title: `Category ${!currentFeatured ? "marked as featured" : "unmarked as featured"}` });
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Error updating featured status", description: error.message, variant: "destructive" });
    }
  };


  if (loading) return <AdminLayout><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Categories</h1>
          <Button onClick={() => navigate("/admin/categories/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Category
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{category.name}</span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => window.open(`/category/${category.slug}`, "_blank")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/categories/${category.id}`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-3">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Posts:</span>
                              <span className="font-medium">{categoryStats[category.id]?.postCount || 0}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Created:</span>
                              <span className="font-medium">{format(new Date(category.created_at), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground break-words">/{category.slug}</p>
                {category.description && (
                  <div>
                    <div 
                      className="text-sm break-words prose prose-sm max-w-none line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: category.description }}
                    />
                    {category.description.length > 150 && (
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
                  <p className="text-sm font-medium break-words">Level: {category.level}</p>
                )}
                <div className="flex items-center gap-2 pt-3 border-t">
                  <Star className={`h-4 w-4 ${category.featured ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">Featured</span>
                  <Switch
                    checked={category.featured}
                    onCheckedChange={() => toggleFeatured(category.id, category.featured)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preview Dialog */}
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
    </AdminLayout>
  );
};

export default AdminCategories;
