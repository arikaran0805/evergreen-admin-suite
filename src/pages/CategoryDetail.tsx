import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { ArrowLeft, BookOpen, Users, Mail, Tag, Play } from "lucide-react";

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
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  // Calculate learners count
  const learnersCount = Math.floor(Math.random() * 15000) + 5000;
  const formattedLearners = learnersCount.toLocaleString();

  useEffect(() => {
    document.title = category ? `${category.name} - BlogHub` : "BlogHub - Course";
  }, [category]);

  useEffect(() => {
    fetchCategoryAndPosts();
    fetchRecentCourses();
    fetchTags();
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

  const fetchRecentCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description")
        .neq("slug", slug)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentCourses(data || []);
    } catch (error) {
      console.error("Error fetching recent courses:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("name")
        .limit(10);

      if (error) throw error;
      setAllTags(data?.map(c => c.name) || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Subscribed!",
      description: "You've been subscribed to our newsletter.",
    });
    setEmail("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center">Loading...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Large Poster Banner */}
      <div className="w-full h-[400px] md:h-[500px] relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        {/* Banner Content */}
        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary text-primary-foreground shadow-lg">
              Course Category
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              {category.name}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground mb-6">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">{formattedLearners} learners</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Course Introduction */}
      <div className="container mx-auto px-4 -mt-20 relative z-10 mb-12">
        <Card className="p-8 shadow-elegant border border-primary/20 bg-card">
          {category.description && (
            <p className="text-xl leading-relaxed text-foreground">
              {category.description}
            </p>
          )}
          {!category.description && (
            <p className="text-xl leading-relaxed text-foreground">
              Welcome to {category.name}. This comprehensive course will guide you through essential concepts and practical applications. 
              Our structured lessons are designed to take you from fundamentals to advanced topics, with hands-on examples and real-world scenarios.
            </p>
          )}
        </Card>
      </div>

      {/* 3-Column Layout */}
      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT SIDEBAR - Course Topics/Lessons List */}
          <aside className="lg:col-span-3">
            <Card className="sticky top-4 border border-primary/10 shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="font-bold text-lg">Course Lessons</h2>
                </div>
                
                <Separator className="mb-4" />
                
                <nav className="space-y-1">
                  {posts.length > 0 ? (
                    posts.map((post, index) => (
                      <Link 
                        key={post.id}
                        to={`/blog/${post.slug}`}
                        className="block group"
                      >
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                              {post.title}
                            </h3>
                          </div>
                          <Play className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground p-3">No lessons available yet</p>
                  )}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* MAIN CONTENT - Detailed Description & Lesson Content */}
          <main className="lg:col-span-6">
            <Card className="border border-primary/10 shadow-card">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold mb-6">About This Course</h2>
                
                <div className="prose prose-lg max-w-none text-foreground mb-8">
                  <p className="text-lg leading-relaxed mb-4">
                    This {category.name} course is designed to provide you with comprehensive knowledge 
                    and practical skills. Whether you're just starting out or looking to advance your expertise, 
                    our structured curriculum will guide you every step of the way.
                  </p>
                  
                  <h3 className="text-2xl font-bold mt-8 mb-4">What You'll Learn</h3>
                  <ul className="space-y-2 text-foreground">
                    <li>Core concepts and fundamental principles</li>
                    <li>Hands-on practical applications</li>
                    <li>Real-world examples and case studies</li>
                    <li>Best practices and industry standards</li>
                    <li>Advanced techniques and optimization strategies</li>
                  </ul>

                  <h3 className="text-2xl font-bold mt-8 mb-4">Course Structure</h3>
                  <p className="text-lg leading-relaxed mb-4">
                    Our {posts.length} lessons are carefully structured to build upon each other, 
                    ensuring a smooth learning progression. Each lesson includes detailed explanations, 
                    visual aids, and practical exercises to reinforce your understanding.
                  </p>

                  <h3 className="text-2xl font-bold mt-8 mb-4">Who This Course Is For</h3>
                  <p className="text-lg leading-relaxed">
                    This course is perfect for beginners looking to get started, intermediate learners 
                    seeking to deepen their knowledge, and advanced practitioners wanting to stay updated 
                    with the latest developments in {category.name}.
                  </p>
                </div>

                <Separator className="my-8" />

                {/* Lessons Preview Cards */}
                {posts.length > 0 && (
                  <>
                    <h2 className="text-2xl font-bold mb-6">Featured Lessons</h2>
                    <div className="grid gap-6">
                      {posts.slice(0, 3).map((post, index) => (
                        <Link key={post.id} to={`/blog/${post.slug}`}>
                          <Card className="group overflow-hidden border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:shadow-md">
                            <CardContent className="p-6">
                              <div className="flex gap-4">
                                {post.featured_image && (
                                  <img 
                                    src={post.featured_image} 
                                    alt={post.title}
                                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                                      Lesson {index + 1}
                                    </Badge>
                                  </div>
                                  <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                                    {post.title}
                                  </h3>
                                  {post.excerpt && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {post.excerpt}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </>
                )}

                <div className="mt-8 p-6 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="font-bold text-xl mb-3">Ready to Get Started?</h3>
                  <p className="text-muted-foreground mb-4">
                    Join {formattedLearners} learners already taking this course. Start your learning journey today!
                  </p>
                  <Link to={posts[0] ? `/blog/${posts[0].slug}` : "#"}>
                    <Button className="bg-primary hover:bg-primary/90 shadow-md w-full sm:w-auto">
                      Start First Lesson
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </main>

          {/* RIGHT SIDEBAR - Recent Courses, Tags, Newsletter, AdSense */}
          <aside className="lg:col-span-3 space-y-6">
            
            {/* Recent Courses */}
            <Card className="border border-primary/10 shadow-card">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Recent Courses</h3>
                <div className="space-y-4">
                  {recentCourses.map((course) => (
                    <Link 
                      key={course.id}
                      to={`/category/${course.slug}`}
                      className="block group"
                    >
                      <div className="p-3 rounded-lg hover:bg-primary/5 transition-colors">
                        <h4 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors">
                          {course.name}
                        </h4>
                        {course.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {course.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="border border-primary/10 shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Newsletter Subscription */}
            <Card className="border border-primary/10 shadow-card bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Newsletter</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Get the latest courses and updates delivered to your inbox.
                </p>
                <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                  <Input 
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-primary/20"
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    Subscribe
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Google AdSense Placeholder */}
            <Card className="border border-primary/10 shadow-card bg-muted/30">
              <CardContent className="p-6">
                <div className="text-center py-16">
                  <p className="text-sm text-muted-foreground font-medium">Advertisement</p>
                  <p className="text-xs text-muted-foreground mt-2">Google AdSense</p>
                  <div className="mt-4 text-xs text-muted-foreground">
                    300 x 250
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Second AdSense Placement */}
            <Card className="border border-primary/10 shadow-card bg-muted/30">
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground font-medium">Advertisement</p>
                  <p className="text-xs text-muted-foreground mt-2">Google AdSense</p>
                  <div className="mt-4 text-xs text-muted-foreground">
                    300 x 600
                  </div>
                </div>
              </CardContent>
            </Card>

          </aside>
        </div>
      </div>

      <style>{`
        .prose {
          color: hsl(var(--foreground));
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          color: hsl(var(--foreground));
          font-weight: 700;
        }
        .prose p {
          line-height: 1.75;
        }
        .prose ul {
          list-style-type: disc;
          padding-left: 1.5em;
        }
        .prose li {
          margin-bottom: 0.5em;
        }
      `}</style>
    </div>
  );
};

export default CategoryDetail;
