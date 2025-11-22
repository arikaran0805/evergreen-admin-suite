import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import BlogCard from "@/components/BlogCard";
import EmojiBackground from "@/components/EmojiBackground";
import { ArrowRight, TrendingUp, Sparkles, Twitter, Facebook, Instagram, Linkedin, Youtube, Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSocialMediaClick } from "@/lib/socialAnalytics";

const Index = () => {
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);
  const [footerCategories, setFooterCategories] = useState<any[]>([]);
  const [siteName, setSiteName] = useState("BlogHub");
  const [logoUrl, setLogoUrl] = useState("");
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
    fetchFooterCategories();
    fetchSiteSettings();
  }, []);

  const fetchFeaturedCourses = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, description')
      .order('created_at', { ascending: false })
      .limit(6);

    if (!error && data) {
      const formattedCourses = data.map((category: any) => ({
        id: category.id,
        title: category.name,
        excerpt: category.description || 'Explore this course category and learn new skills',
        category: category.name,
        readTime: 0,
        views: Math.floor(Math.random() * 15000) + 5000,
        image: '/placeholder.svg',
        date: 'Course Category',
        author: 'BlogHub Team',
        slug: category.slug
      }));
      setFeaturedCourses(formattedCourses);
    }
  };

  const fetchFooterCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
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
      .select('site_name, logo_url, twitter_url, facebook_url, instagram_url, linkedin_url, youtube_url, github_url')
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setSiteName(data.site_name || "BlogHub");
      setLogoUrl(data.logo_url || "");
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
              Discover{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Stories
              </span>{" "}
              That Inspire
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
              Join thousands of readers exploring ideas, insights, and inspiration across technology, lifestyle, business, and more.
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCourses.map((course) => (
              <BlogCard key={course.id} {...course} linkType="category" />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/blogs">
              <Button size="lg" className="bg-gradient-primary shadow-elegant hover:shadow-glow">
                View All Courses
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
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
                <Button size="lg" variant="outline" className="border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
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
                  Inspiring stories and ideas for curious minds.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Categories</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {footerCategories.map((category) => (
                    <li key={category.slug}>
                      <Link to={`/category/${category.slug}`} className="hover:text-primary">
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
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Connect</h3>
                <div className="flex gap-3">
                  {socialLinks.twitter && (
                    <a 
                      href={socialLinks.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialMediaClick("twitter")}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Twitter"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a 
                      href={socialLinks.facebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialMediaClick("facebook")}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a 
                      href={socialLinks.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialMediaClick("instagram")}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a 
                      href={socialLinks.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialMediaClick("linkedin")}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="h-5 w-5" />
                    </a>
                  )}
                  {socialLinks.youtube && (
                    <a 
                      href={socialLinks.youtube} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialMediaClick("youtube")}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="YouTube"
                    >
                      <Youtube className="h-5 w-5" />
                    </a>
                  )}
                  {socialLinks.github && (
                    <a 
                      href={socialLinks.github} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialMediaClick("github")}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      aria-label="GitHub"
                    >
                      <Github className="h-5 w-5" />
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
