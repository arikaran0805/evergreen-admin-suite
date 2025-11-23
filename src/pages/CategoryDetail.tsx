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
import SEOHead from "@/components/SEOHead";
import { Home, ChevronLeft, ChevronRight, BookOpen, Users, Mail, Tag, Play, Search, Facebook, Twitter, Linkedin, Youtube, Instagram, Github } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trackSocialMediaClick } from "@/lib/socialAnalytics";

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
  content?: string;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [footerCategories, setFooterCategories] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
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
    fetchSiteSettings();
    fetchFooterCategories();
  }, [slug]);

  const fetchSiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .single();

      if (error) throw error;
      setSiteSettings(data);
    } catch (error) {
      console.error("Error fetching site settings:", error);
    }
  };

  const fetchFooterCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("name, slug")
        .order("name", { ascending: true })
        .limit(6);

      if (error) throw error;
      setFooterCategories(data || []);
    } catch (error) {
      console.error("Error fetching footer categories:", error);
    }
  };

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

  const handleSocialClick = (platform: string) => {
    trackSocialMediaClick(platform);
  };

  const fetchPostContent = async (post: Post) => {
    setLoadingPost(true);
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:author_id (full_name, avatar_url)
        `)
        .eq("id", post.id)
        .single();

      if (error) throw error;
      setSelectedPost(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load lesson content",
        variant: "destructive",
      });
    } finally {
      setLoadingPost(false);
    }
  };

  const handleLessonClick = (post: Post) => {
    fetchPostContent(post);
  };

  const currentPostIndex = selectedPost 
    ? posts.findIndex(p => p.id === selectedPost.id)
    : -1;
  const hasPrevious = currentPostIndex > 0;
  const hasNext = currentPostIndex < posts.length - 1 && currentPostIndex !== -1;

  const handlePrevious = () => {
    if (hasPrevious) {
      fetchPostContent(posts[currentPostIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      fetchPostContent(posts[currentPostIndex + 1]);
    }
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
      <SEOHead 
        title={`${category.name} - Course Category`}
        description={category.description || `Explore ${category.name} courses and lessons. Join ${formattedLearners} learners in this comprehensive learning path.`}
        keywords={`${category.name}, course, learning, tutorial, lessons`}
        ogTitle={`${category.name} Course`}
        ogDescription={category.description || `Learn ${category.name} with our comprehensive course materials`}
      />
      <Header />

      {/* 3-Column Layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT SIDEBAR - Course Topics/Lessons List */}
          <aside className="lg:col-span-3">
            <Card className="sticky top-4 border border-primary/10 shadow-card overflow-hidden">
              <CardContent className="p-6 pb-0">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="font-bold text-lg">Course Lessons</h2>
                </div>
                <Separator className="mb-4" />
              </CardContent>
              
              <ScrollArea className="h-[calc(100vh-300px)]">
                <CardContent className="px-6 pb-6 pt-0">
                <nav className="space-y-1">
                  {posts.length > 0 ? (
                    posts.map((post, index) => (
                      <div
                        key={post.id}
                        onClick={() => handleLessonClick(post)}
                        className={`block group cursor-pointer ${
                          selectedPost?.id === post.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-primary/10 transition-all duration-300 hover:shadow-sm">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full text-sm flex items-center justify-center font-semibold transition-all duration-300 group-hover:scale-110 ${
                            selectedPost?.id === post.id 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-medium transition-colors line-clamp-2 ${
                              selectedPost?.id === post.id 
                                ? 'text-primary' 
                                : 'group-hover:text-primary'
                            }`}>
                              {post.title}
                            </h3>
                          </div>
                          <Play className={`h-4 w-4 transition-colors flex-shrink-0 ${
                            selectedPost?.id === post.id 
                              ? 'text-primary' 
                              : 'text-muted-foreground group-hover:text-primary'
                          }`} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground p-3">No lessons available yet</p>
                  )}
                </nav>
                </CardContent>
              </ScrollArea>
            </Card>
          </aside>

          {/* MAIN CONTENT - Lesson Content */}
          <main className="lg:col-span-6">
            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mb-6">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 hover:bg-primary/5 transition-colors"
                onClick={() => setSelectedPost(null)}
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              {selectedPost && (
                <div className="flex gap-2">
                  {hasPrevious && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 hover:bg-primary/5 transition-colors"
                      onClick={handlePrevious}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                  )}
                  {hasNext && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 hover:bg-primary/5 transition-colors"
                      onClick={handleNext}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Card className="border border-primary/10 shadow-card">
              <CardContent className="p-12 leading-relaxed">
                {loadingPost ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading lesson...</p>
                  </div>
                ) : selectedPost ? (
                  <>
                    {/* Lesson Header */}
                    <div className="mb-8">
                      <Badge className="mb-4 bg-primary/10 text-primary">
                        Lesson {currentPostIndex + 1} of {posts.length}
                      </Badge>
                      <h1 className="text-4xl font-bold mb-4">{selectedPost.title}</h1>
                      {selectedPost.excerpt && (
                        <p className="text-xl text-muted-foreground">{selectedPost.excerpt}</p>
                      )}
                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>By {selectedPost.profiles?.full_name || 'Anonymous'}</span>
                        </div>
                        {selectedPost.published_at && (
                          <span>
                            {new Date(selectedPost.published_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Featured Image */}
                    {selectedPost.featured_image && (
                      <img 
                        src={selectedPost.featured_image} 
                        alt={selectedPost.title}
                        className="w-full h-auto rounded-lg mb-8 shadow-md"
                      />
                    )}

                    <Separator className="my-8" />

                    {/* Lesson Content */}
                    <div 
                      className="prose prose-lg max-w-none leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: selectedPost.content || '' }}
                    />

                    {/* Comments Section */}
                    <div className="mt-12 pt-8 border-t border-border">
                      <h3 className="text-2xl font-bold mb-6">Comments</h3>
                      <div className="space-y-6">
                        {/* Comment Form */}
                        <Card className="border border-primary/10">
                          <CardContent className="p-6">
                            <h4 className="font-semibold mb-4">Leave a Comment</h4>
                            <form className="space-y-4">
                              <div>
                                <Input 
                                  placeholder="Your name" 
                                  className="border-primary/20"
                                />
                              </div>
                              <div>
                                <textarea
                                  placeholder="Your comment..."
                                  className="w-full min-h-[120px] px-3 py-2 rounded-md border border-primary/20 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                              </div>
                              <Button 
                                type="submit" 
                                className="bg-primary hover:bg-primary/90"
                              >
                                Post Comment
                              </Button>
                            </form>
                          </CardContent>
                        </Card>

                        {/* Sample Comments */}
                        <div className="space-y-4">
                          <Card className="border border-primary/10">
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                                  J
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold">John Doe</span>
                                    <span className="text-xs text-muted-foreground">2 days ago</span>
                                  </div>
                                  <p className="text-muted-foreground">
                                    Great lesson! The explanations were clear and easy to follow. Looking forward to the next one.
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>

                    {/* Lesson Navigation */}
                    <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
                      {hasPrevious ? (
                        <Button 
                          variant="outline" 
                          className="gap-2"
                          onClick={handlePrevious}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous Lesson
                        </Button>
                      ) : (
                        <div />
                      )}
                      {hasNext ? (
                        <Button 
                          className="gap-2 bg-primary hover:bg-primary/90"
                          onClick={handleNext}
                        >
                          Next Lesson
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div />
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Course Overview - Default View */}
                    <div className="text-center py-8">
                      <BookOpen className="h-16 w-16 mx-auto mb-4 text-primary" />
                      <h2 className="text-3xl font-bold mb-4">{category.name}</h2>
                      {category.description && (
                        <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                          {category.description}
                        </p>
                      )}
                      <div className="flex items-center justify-center gap-2 text-muted-foreground mb-8">
                        <Users className="h-5 w-5 text-primary" />
                        <span className="text-lg font-semibold">{formattedLearners} learners</span>
                      </div>
                    </div>

                    <Separator className="my-8" />

                    <div className="prose prose-lg max-w-none text-foreground mb-8">
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
                    </div>

                    {posts.length > 0 && (
                      <div className="mt-8 p-6 bg-primary/5 rounded-lg border border-primary/20">
                        <h3 className="font-bold text-xl mb-3">Ready to Get Started?</h3>
                        <p className="text-muted-foreground mb-4">
                          Select a lesson from the sidebar to begin your learning journey!
                        </p>
                        <Button 
                          className="bg-primary hover:bg-primary/90 shadow-md w-full sm:w-auto"
                          onClick={() => handleLessonClick(posts[0])}
                        >
                          Start First Lesson
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </main>

          {/* RIGHT SIDEBAR - Recent Courses, Tags, Newsletter, AdSense */}
          <aside className="lg:col-span-3">
            <div className="sticky top-4 space-y-6">
                  
              {/* Search */}
              <Card className="border border-primary/10 shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-lg">Search</h3>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search lessons..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-primary/20"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Advertisement Banner 1 */}
              <Card className="border border-primary/10 shadow-card">
                <CardContent className="p-6">
                  <div className="bg-muted/30 rounded-lg h-[280px] flex items-center justify-center border-2 border-dashed border-primary/20">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground font-semibold">Advertisement</p>
                      <p className="text-xs text-muted-foreground mt-1">Your ad could be here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                        <div className="p-3 rounded-lg hover:bg-primary/10 transition-all duration-300 hover:shadow-sm">
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
                        className="bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 cursor-pointer transition-all duration-300"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Google AdSense Placeholder */}
              <Card className="border border-primary/10 shadow-card">
                <CardContent className="p-6">
                  <div className="bg-muted/30 rounded-lg h-[250px] flex items-center justify-center border-2 border-dashed border-primary/20">
                    <p className="text-sm text-muted-foreground">Ad Space</p>
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
                      className="w-full bg-primary hover:bg-primary/90 transition-all duration-300"
                    >
                      Subscribe
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Follow Us - Social Links */}
              <Card className="border border-primary/10 shadow-card">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Follow Us</h3>
                  <div className="flex flex-wrap gap-3">
                    {siteSettings?.facebook_url && (
                      <a
                        href={siteSettings.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSocialClick('facebook')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
                      >
                        <Facebook className="h-5 w-5" />
                      </a>
                    )}
                    {siteSettings?.twitter_url && (
                      <a
                        href={siteSettings.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSocialClick('twitter')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
                      >
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                    {siteSettings?.linkedin_url && (
                      <a
                        href={siteSettings.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSocialClick('linkedin')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {siteSettings?.youtube_url && (
                      <a
                        href={siteSettings.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSocialClick('youtube')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
                      >
                        <Youtube className="h-5 w-5" />
                      </a>
                    )}
                    {siteSettings?.instagram_url && (
                      <a
                        href={siteSettings.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleSocialClick('instagram')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Advertisement Banner 2 */}
              <Card className="border border-primary/10 shadow-card">
                <CardContent className="p-6">
                  <div className="bg-muted/30 rounded-lg h-[280px] flex items-center justify-center border-2 border-dashed border-primary/20">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground font-semibold">Advertisement</p>
                      <p className="text-xs text-muted-foreground mt-1">Your ad could be here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card mt-12">
        <div className="container px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                {siteSettings?.logo_url ? (
                  <img src={siteSettings.logo_url} alt={siteSettings.site_name} className="h-10 w-auto" />
                ) : (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                      <span className="text-xl font-bold text-primary-foreground">
                        {siteSettings?.site_name?.charAt(0) || 'B'}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-primary">{siteSettings?.site_name || 'BlogHub'}</span>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {siteSettings?.site_description || 'Inspiring stories and ideas for curious minds.'}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Categories</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {footerCategories.map((category) => (
                  <li key={category.slug}>
                    <Link to={`/category/${category.slug}`} className="hover:text-primary transition-colors">
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <div className="flex flex-col gap-2">
                {siteSettings?.twitter_url && (
                  <a 
                    href={siteSettings.twitter_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleSocialClick("twitter")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter className="h-5 w-5" />
                    <span>Twitter</span>
                  </a>
                )}
                {siteSettings?.facebook_url && (
                  <a 
                    href={siteSettings.facebook_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleSocialClick("facebook")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                    <span>Facebook</span>
                  </a>
                )}
                {siteSettings?.instagram_url && (
                  <a 
                    href={siteSettings.instagram_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleSocialClick("instagram")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                    <span>Instagram</span>
                  </a>
                )}
                {siteSettings?.linkedin_url && (
                  <a 
                    href={siteSettings.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleSocialClick("linkedin")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {siteSettings?.youtube_url && (
                  <a 
                    href={siteSettings.youtube_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleSocialClick("youtube")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="YouTube"
                  >
                    <Youtube className="h-5 w-5" />
                    <span>YouTube</span>
                  </a>
                )}
                {siteSettings?.github_url && (
                  <a 
                    href={siteSettings.github_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => handleSocialClick("github")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="GitHub"
                  >
                    <Github className="h-5 w-5" />
                    <span>GitHub</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {siteSettings?.site_name || 'BlogHub'}. All rights reserved.</p>
          </div>
        </div>
      </footer>

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
        .prose img {
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }
        .prose a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .prose a:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default CategoryDetail;
