import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import { ArrowRight, Play, BookOpen, Users, Award, ChevronRight, Twitter, Facebook, Instagram, Linkedin, Youtube, Github, Sparkles, GraduationCap, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSocialMediaClick } from "@/lib/socialAnalytics";

const Index = () => {
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);
  const [footerCategories, setFooterCategories] = useState<any[]>([]);
  const [siteName, setSiteName] = useState("EmojiLearn");
  const [siteDescription, setSiteDescription] = useState("Learn through visuals that stick.");
  const [heroHeadline, setHeroHeadline] = useState("Master Any Subject");
  const [heroSubheadline, setHeroSubheadline] = useState("Learn through emojis, visuals, and stories that spark clarity and deeper understanding.");
  const [heroHighlightText, setHeroHighlightText] = useState("Any Subject");
  const [heroHighlightColor, setHeroHighlightColor] = useState("#10b981");
  const [socialLinks, setSocialLinks] = useState({
    twitter: "", facebook: "", instagram: "", linkedin: "", youtube: "", github: "",
  });

  useEffect(() => {
    fetchFeaturedCourses();
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
      setFeaturedCourses(data.map((course: any) => ({
        id: course.id,
        title: course.name,
        description: course.description || 'Explore this course',
        image: course.featured_image || '/placeholder.svg',
        slug: course.slug,
        level: course.level || 'Beginner'
      })));
    }
  };

  const fetchFooterCategories = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('name, slug')
      .order('created_at', { ascending: false })
      .limit(5);
    if (!error && data) setFooterCategories(data);
  };

  const fetchSiteSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('site_name, site_description, hero_headline, hero_subheadline, hero_highlight_text, hero_highlight_color, twitter_url, facebook_url, instagram_url, linkedin_url, youtube_url, github_url')
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setSiteName(data.site_name || "EmojiLearn");
      setSiteDescription(data.site_description || "Learn through visuals that stick.");
      setHeroHeadline(data.hero_headline || "Master Any Subject");
      setHeroSubheadline(data.hero_subheadline || "Learn through emojis, visuals, and stories that spark clarity and deeper understanding.");
      setHeroHighlightText(data.hero_highlight_text || "Any Subject");
      setHeroHighlightColor(data.hero_highlight_color || "#10b981");
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

  const stats = [
    { icon: Users, value: "50K+", label: "Active Learners" },
    { icon: BookOpen, value: "200+", label: "Courses" },
    { icon: Award, value: "95%", label: "Success Rate" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <SEOHead />
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <Header />

      {/* Hero Section */}
      <section className="relative pt-8 pb-20 md:pt-16 md:pb-32">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            {/* Badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">The Visual Learning Platform</span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-center leading-[0.9] tracking-tight mb-6">
              <span className="block text-foreground">
                {heroHeadline.split(heroHighlightText)[0]}
              </span>
              <span 
                className="block bg-clip-text text-transparent bg-gradient-to-r from-primary via-emerald-400 to-teal-400"
                style={{ 
                  backgroundImage: `linear-gradient(135deg, ${heroHighlightColor}, ${heroHighlightColor}88, ${heroHighlightColor})`
                }}
              >
                {heroHighlightText}
              </span>
              <span className="block text-foreground">
                {heroHeadline.split(heroHighlightText)[1]}
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground text-center max-w-2xl mx-auto mb-10 leading-relaxed">
              {heroSubheadline}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link to="/courses">
                <Button size="lg" className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group">
                  Start Learning Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold border-2 hover:bg-muted/50 group">
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <stat.icon className="h-5 w-5 text-primary" />
                    <span className="text-3xl md:text-4xl font-black text-foreground">{stat.value}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-bounce delay-100">📚</div>
        <div className="absolute top-40 right-10 text-5xl opacity-20 animate-bounce delay-300">🎯</div>
        <div className="absolute bottom-20 left-20 text-4xl opacity-20 animate-bounce delay-500">💡</div>
        <div className="absolute bottom-40 right-20 text-5xl opacity-20 animate-bounce delay-700">🚀</div>
      </section>

      {/* Featured Courses */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-12 bg-primary rounded-full" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Explore</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-foreground">Featured Courses</h2>
            </div>
            <Link to="/courses">
              <Button variant="ghost" className="group text-muted-foreground hover:text-primary">
                View All Courses
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCourses.map((course, index) => (
              <Link key={course.id} to={`/courses/${course.slug}`} className="group">
                <div className="relative h-full bg-card rounded-2xl border border-border/50 overflow-hidden hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={course.image} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 text-xs font-semibold bg-primary/90 text-primary-foreground rounded-full">
                        {course.level}
                      </span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                      {course.description}
                    </p>
                    <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
                      Start Learning
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Ready to Start Your Journey */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="container px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-8 rotate-3 hover:rotate-0 transition-transform duration-300">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>

            <h2 className="text-4xl md:text-6xl font-black text-foreground mb-6">
              Ready to Start Your
              <span className="block text-primary">Learning Journey?</span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of learners who've transformed their understanding through our visual-first approach. No boring textbooks, just engaging content.
            </p>

            {/* Features */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {["Free to Start", "No Credit Card", "Instant Access", "Learn at Your Pace"].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <Link to="/courses">
              <Button size="lg" className="h-16 px-12 text-lg font-bold bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 group">
                Explore All Courses
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-1/4 left-10 text-5xl opacity-10">🎓</div>
        <div className="absolute bottom-1/4 right-10 text-5xl opacity-10">✨</div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="container px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-xl">📖</span>
                </div>
                <span className="text-xl font-black text-foreground">{siteName}</span>
              </div>
              <p className="text-muted-foreground text-sm mb-6">
                {siteDescription}
              </p>
              {/* Social Links */}
              <div className="flex gap-3">
                {socialLinks.twitter && (
                  <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialMediaClick('twitter')} className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialMediaClick('facebook')} className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialMediaClick('instagram')} className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialMediaClick('linkedin')} className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialMediaClick('youtube')} className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.github && (
                  <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialMediaClick('github')} className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Github className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Courses */}
            <div>
              <h4 className="font-bold text-foreground mb-4">Popular Courses</h4>
              <ul className="space-y-3">
                {footerCategories.map((cat) => (
                  <li key={cat.slug}>
                    <Link to={`/courses/${cat.slug}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-bold text-foreground mb-4">Company</h4>
              <ul className="space-y-3">
                <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
                <li><Link to="/courses" className="text-sm text-muted-foreground hover:text-primary transition-colors">All Courses</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-bold text-foreground mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} {siteName}. All rights reserved.
              </p>
              <p className="text-sm text-muted-foreground">
                Made with 💚 for visual learners everywhere
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
