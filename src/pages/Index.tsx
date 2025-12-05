import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import BlogCard from "@/components/BlogCard";
import EmojiBackground from "@/components/EmojiBackground";
import SEOHead from "@/components/SEOHead";
import { ArrowRight, TrendingUp, Sparkles, Twitter, Facebook, Instagram, Linkedin, Youtube, Github, Lightbulb, Zap, Target, Star, CheckCircle, BookOpen, Brain, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSocialMediaClick } from "@/lib/socialAnalytics";

const Index = () => {
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);
  const [latestPosts, setLatestPosts] = useState<any[]>([]);
  const [footerCategories, setFooterCategories] = useState<any[]>([]);
  const [siteName, setSiteName] = useState("BlogHub");
  const [logoUrl, setLogoUrl] = useState("");
  const [siteDescription, setSiteDescription] = useState("Inspiring stories and ideas for curious minds.");
  const [heroHeadline, setHeroHeadline] = useState("Join Learners Who Think Differently");
  const [heroSubheadline, setHeroSubheadline] = useState("Learn through emojis, visuals, and stories that spark clarity, creativity, and deeper understanding.");
  const [heroHighlightText, setHeroHighlightText] = useState("Think Differently");
  const [heroHighlightColor, setHeroHighlightColor] = useState("#22c55e");
  const [email, setEmail] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    twitter: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    github: "",
  });

  useEffect(() => {
    document.title = "BlogHub - Home";
    fetchFeaturedCourses();
    fetchLatestPosts();
    fetchFooterCategories();
    fetchSiteSettings();
  }, []);

  const fetchFeaturedCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, slug, description, level, featured_image')
      .eq('featured', true)
      .order('name', { ascending: true })
      .limit(6);

    if (!error && data) {
      const formattedCourses = data.map((category: any) => ({
        id: category.id,
        title: category.name,
        excerpt: category.description || 'Explore this course and learn new skills',
        category: category.name,
        image: category.featured_image || '/placeholder.svg',
        date: 'Course',
        author: 'BlogHub Team',
        slug: category.slug,
        rating: Math.random() * 1.5 + 3.5, // Random rating between 3.5 and 5.0
        level: (category.level || 'Beginner') as "Beginner" | "Intermediate" | "Advanced"
      }));
      setFeaturedCourses(formattedCourses);
    }
  };

  const fetchLatestPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, slug, excerpt, featured_image, created_at, category_id, courses(name)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6);

    if (!error && data) {
      const formattedPosts = data.map((post: any) => ({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt || 'Read this article to learn more',
        category: post.courses?.name || 'General',
        image: post.featured_image || '/placeholder.svg',
        date: new Date(post.created_at).toLocaleDateString(),
        author: 'BlogHub Team',
        slug: post.slug
      }));
      setLatestPosts(formattedPosts);
    }
  };

  const fetchFooterCategories = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('name, slug')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setFooterCategories(data);
    }
  };

  const fetchSiteSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('site_name, site_description, logo_url, hero_headline, hero_subheadline, hero_highlight_text, hero_highlight_color, twitter_url, facebook_url, instagram_url, linkedin_url, youtube_url, github_url')
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setSiteName(data.site_name || "BlogHub");
      setSiteDescription(data.site_description || "Inspiring stories and ideas for curious minds.");
      setLogoUrl(data.logo_url || "");
      setHeroHeadline(data.hero_headline || "Join Learners Who Think Differently");
      setHeroSubheadline(data.hero_subheadline || "Learn through emojis, visuals, and stories that spark clarity, creativity, and deeper understanding.");
      setHeroHighlightText(data.hero_highlight_text || "Think Differently");
      setHeroHighlightColor(data.hero_highlight_color || "#22c55e");
      setSocialLinks({
        twitter: data.twitter_url || "",
        facebook: data.facebook_url || "",
        instagram: data.instagram_url || "",
        linkedin: data.linkedin_url || "",
        youtube: data.youtube_url || "",
        github: data.github_url || "",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SEOHead />
      <EmojiBackground />
      
      <div className="relative z-10">
        <Header />

        {/* Hero Section */}
        <section className="container px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-in fade-in slide-in-from-bottom-3 duration-700">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Welcome to {siteName}</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              {heroHeadline.split(heroHighlightText).map((part, index, array) => (
                <span key={index}>
                  {part}
                  {index < array.length - 1 && (
                    <span style={{ color: heroHighlightColor }}>
                      {heroHighlightText}
                    </span>
                  )}
                </span>
              ))}
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
              {heroSubheadline}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
              <div className="relative w-full sm:w-96">
                <Input
                  placeholder="Search articles..."
                  className="pr-10 border-2 border-primary/20 focus:border-primary/50 h-12"
                />
                <Button
                  size="icon"
                  className="absolute right-1 top-1 bg-gradient-primary hover:shadow-glow"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <Link to="/blogs">
                <Button size="lg" variant="outline" className="border-2 border-primary/30 hover:bg-primary/10">
                  Explore All Posts
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Courses */}
        <section className="container px-4 py-16">
          <div className="flex items-center gap-2 mb-8">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold">Featured Courses</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCourses.map((course) => (
              <BlogCard key={course.id} {...course} linkType="category" />
            ))}
          </div>
        </section>

        {/* Trending Blog Posts Section */}
        <section className="container px-4 py-16">
          <div className="flex items-center gap-2 mb-8">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold">Latest Blog Posts</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {latestPosts.map((post) => (
              <BlogCard key={post.id} {...post} linkType="blog" />
            ))}
          </div>
        </section>

        {/* What We Offer Section */}
        <section className="container px-4 py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What We Offer</h2>
            <p className="text-muted-foreground">Experience learning like never before</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Visual Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Learn visually using emojis and engaging illustrations</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Beginner-Friendly</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Easy-to-follow lessons designed for all skill levels</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Real-World Focus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Practical explanations you can apply immediately</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Rocket className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Fast & Motivating</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Modern UI that keeps you engaged and excited</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container px-4 py-16">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Your learning journey in 4 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                <span className="text-2xl font-bold text-primary-foreground">1</span>
              </div>
              <BookOpen className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">Choose a Course</h3>
              <p className="text-sm text-muted-foreground">Browse our library and pick what interests you</p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                <span className="text-2xl font-bold text-primary-foreground">2</span>
              </div>
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">Learn with Emojis</h3>
              <p className="text-sm text-muted-foreground">Follow emoji-based lessons that make concepts clear</p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                <span className="text-2xl font-bold text-primary-foreground">3</span>
              </div>
              <Brain className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">Understand Deeply</h3>
              <p className="text-sm text-muted-foreground">Grasp concepts at a fundamental level</p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                <span className="text-2xl font-bold text-primary-foreground">4</span>
              </div>
              <CheckCircle className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">Apply Concepts</h3>
              <p className="text-sm text-muted-foreground">Put your knowledge into practice</p>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="container px-4 py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Us</h2>
            <p className="text-muted-foreground">What makes our platform unique</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="flex gap-4 p-6 bg-card rounded-lg border-2 hover:border-primary/50 transition-colors">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Emoji-Powered Learning</h3>
                <p className="text-muted-foreground">Visual representations that make complex topics simple and memorable</p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-card rounded-lg border-2 hover:border-primary/50 transition-colors">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Motivating UI</h3>
                <p className="text-muted-foreground">Beautiful, modern interface that keeps you engaged and excited to learn</p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-card rounded-lg border-2 hover:border-primary/50 transition-colors">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Modern Visual Content</h3>
                <p className="text-muted-foreground">Contemporary design and illustrations that resonate with today's learners</p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-card rounded-lg border-2 hover:border-primary/50 transition-colors">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Not Boring Textbooks</h3>
                <p className="text-muted-foreground">Say goodbye to dry content and hello to engaging, interactive learning</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="container px-4 py-16">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Learners Say</h2>
            <p className="text-muted-foreground">Join thousands of happy learners</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-foreground">SK</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">Sarah Khan</CardTitle>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">"The emoji-based learning approach made complex concepts so easy to understand. I wish all courses were like this!"</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-foreground">MR</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">Mike Rodriguez</CardTitle>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">"Finally, a platform that doesn't feel like reading a textbook. The visual style keeps me motivated!"</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-foreground">AP</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">Aisha Patel</CardTitle>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">"Perfect for beginners! The step-by-step approach with emojis made learning fun and effective."</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="container px-4 py-16 bg-muted/30">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Stay Connected</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Our Newsletter</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Stay updated with new courses and learning tips delivered to your inbox.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 border-2 border-primary/20 focus:border-primary/50 h-12"
              />
              <Button size="lg" className="bg-gradient-primary shadow-elegant hover:shadow-glow">
                Subscribe
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container px-4 py-16">
          <div className="max-w-4xl mx-auto text-center bg-gradient-primary rounded-2xl p-12 shadow-elegant">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Start Your Journey?
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8">
              Join our community and get exclusive access to premium content, weekly newsletters, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="shadow-lg">
                  Sign Up Free
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="secondary" className="shadow-lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-12 bg-card">
          <div className="container px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
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
                  {siteDescription}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Courses</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {footerCategories.map((category) => (
                    <li key={category.slug}>
                      <Link to={`/course/${category.slug}`} className="hover:text-primary">
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/about" className="hover:text-primary">About</Link></li>
                  <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
                  <li><Link to="/terms" className="hover:text-primary">Terms of Service</Link></li>
                  <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Connect</h3>
                <div className="flex flex-col gap-2">
                  {socialLinks.twitter && (
                    <a 
                      href={socialLinks.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialMediaClick("twitter")}
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Twitter"
                    >
                      <Twitter className="h-5 w-5" />
                      <span>Twitter</span>
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a 
                      href={socialLinks.facebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialMediaClick("facebook")}
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="h-5 w-5" />
                      <span>Facebook</span>
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a 
                      href={socialLinks.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialMediaClick("instagram")}
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="h-5 w-5" />
                      <span>Instagram</span>
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a 
                      href={socialLinks.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialMediaClick("linkedin")}
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="h-5 w-5" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {socialLinks.youtube && (
                    <a 
                      href={socialLinks.youtube} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialMediaClick("youtube")}
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      aria-label="YouTube"
                    >
                      <Youtube className="h-5 w-5" />
                      <span>YouTube</span>
                    </a>
                  )}
                  {socialLinks.github && (
                    <a 
                      href={socialLinks.github} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialMediaClick("github")}
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
              <p>&copy; 2025 {siteName}. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
