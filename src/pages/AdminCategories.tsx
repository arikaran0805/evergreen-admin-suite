import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Star } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured: boolean;
  level: string | null;
}

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

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
    } catch (error: any) {
      toast({ title: "Error fetching categories", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
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
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/categories/${category.id}`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground break-words">/{category.slug}</p>
                {category.description && (
                  <div>
                    <p className={`text-sm break-words ${!expandedCards.has(category.id) ? "line-clamp-3" : ""}`}>
                      {category.description}
                    </p>
                    {category.description.length > 150 && (
                      <button
                        onClick={() => toggleExpand(category.id)}
                        className="text-xs text-primary hover:underline mt-1"
                      >
                        {expandedCards.has(category.id) ? "Read less" : "Read more"}
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
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
