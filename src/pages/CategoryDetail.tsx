import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { ArrowLeft, BookOpen, Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface Post {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  featured_image: string | null;
  published_at: string | null;
  profiles: {
    full_name: string | null;
  };
}

const CategoryDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    document.title = category ? `${category.name} - BlogHub` : "BlogHub - Course";
  }, [category]);

  useEffect(() => {
    fetchCategoryAndPosts();
  }, [slug]);

  const fetchCategoryAndPosts = async () => {
    try {
      // Fetch category
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .single();

      if (categoryError) throw categoryError;
      setCategory(categoryData);

      // Fetch posts in this category
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          excerpt,
          slug,
          featured_image,
          published_at,
          profiles:author_id (full_name)
        `)
        .eq("category_id", categoryData.id)
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center">Loading...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <Link to="/">
            <Button className="bg-primary hover:bg-primary/90">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>

        {/* Course Header */}
        <Card className="p-8 mb-8 border border-primary/10 shadow-elegant bg-gradient-to-br from-primary/5 via-background to-background">
          <Badge className="mb-4 bg-primary text-primary-foreground">
            Course Category
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {category.name}
          </h1>

          {category.description && (
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              {category.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold">{posts.length} Lessons</span>
            </div>
          </div>
        </Card>

        {/* Lessons/Posts List */}
        <div className="mb-6 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Course Lessons</h2>
        </div>

        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, index) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="group overflow-hidden border border-primary/10 hover:border-primary/30 transition-all duration-500 bg-gradient-to-br from-primary/5 via-background to-background hover:shadow-[0_8px_30px_hsl(var(--primary)/0.12)] h-full">
                  {/* Lesson Image */}
                  {post.featured_image && (
                    <div className="relative overflow-hidden aspect-video">
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {/* Lesson Number Badge */}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-primary text-primary-foreground border-0 shadow-lg">
                          Lesson {index + 1}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6 space-y-3">
                    <h3 className="text-xl font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300">
                      {post.title}
                    </h3>

                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                      {post.profiles?.full_name && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{post.profiles.full_name}</span>
                        </div>
                      )}
                      {post.published_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(post.published_at), "MMM d, yyyy")}</span>
                        </div>
                      )}
                    </div>

                    <Button 
                      className="w-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary border-0 transition-all duration-300 group-hover:shadow-md"
                    >
                      Start Lesson
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center border border-primary/10">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No lessons yet</h3>
            <p className="text-muted-foreground">
              Lessons for this course are coming soon. Check back later!
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CategoryDetail;
