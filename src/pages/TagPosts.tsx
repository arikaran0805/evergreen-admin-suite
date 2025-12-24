import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import BlogCard from "@/components/BlogCard";
import SEOHead from "@/components/SEOHead";
import { Tag, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Post {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  featured_image: string | null;
  published_at: string | null;
  category_id: string | null;
  courses?: {
    name: string;
    slug: string;
  } | null;
}

const TagPosts = () => {
  const { slug } = useParams<{ slug: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tagName, setTagName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchTagAndPosts();
    }
  }, [slug]);

  const fetchTagAndPosts = async () => {
    setLoading(true);
    try {
      // First get the tag
      const { data: tagData, error: tagError } = await supabase
        .from("tags")
        .select("id, name")
        .eq("slug", slug)
        .single();

      if (tagError) throw tagError;
      setTagName(tagData.name);

      // Get post IDs with this tag
      const { data: postTagsData, error: postTagsError } = await supabase
        .from("post_tags")
        .select("post_id")
        .eq("tag_id", tagData.id);

      if (postTagsError) throw postTagsError;

      if (postTagsData && postTagsData.length > 0) {
        const postIds = postTagsData.map(pt => pt.post_id);

        // Get the posts (all posts regardless of status on public pages)
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select(`
            id,
            title,
            excerpt,
            slug,
            featured_image,
            published_at,
            category_id,
            courses:category_id (name, slug)
          `)
          .in("id", postIds)
          .order("published_at", { ascending: false });

        if (postsError) throw postsError;
        setPosts(postsData || []);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error("Error fetching tag posts:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <SEOHead 
        title={`Posts tagged "${tagName}"`}
        description={`Browse all posts tagged with ${tagName}`}
      />

      <div className="container px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Link to="/courses">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Courses
            </Button>
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <Tag className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">
              Posts tagged: <span className="text-primary">{tagName}</span>
            </h1>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 bg-card rounded-lg animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-6">No posts found with this tag</p>
              <Link to="/courses">
                <Button>Browse Courses</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => (
                <BlogCard 
                  key={post.id}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                  category={post.courses?.name || "Uncategorized"}
                  image={post.featured_image || "/placeholder.svg"}
                  date={post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}
                  author=""
                  slug={post.courses?.slug || ""}
                  lessonSlug={post.slug}
                  linkType="lesson"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TagPosts;
