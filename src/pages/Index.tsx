import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import { ArrowRight, ArrowUpRight, Compass, Star, Circle, Triangle, Square, Twitter, Facebook, Instagram, Linkedin, Youtube, Github, Hexagon, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSocialMediaClick } from "@/lib/socialAnalytics";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

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

  // Scroll animation hooks
  const heroAnimation = useScrollAnimation({ threshold: 0.2 });
  const coursesAnimation = useScrollAnimation({ threshold: 0.1 });
  const ctaAnimation = useScrollAnimation({ threshold: 0.2 });
  const footerAnimation = useScrollAnimation({ threshold: 0.1 });

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

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <SEOHead />
      <Header />

      {/* Hero Section - Dramatic Editorial Style */}
      <section 
        ref={heroAnimation.ref}
        className={`relative min-h-[90vh] flex items-center overflow-hidden transition-all duration-1000 ${
          heroAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Geometric Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Large rotating circle */}
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full border-[60px] border-primary/10 animate-[spin_60s_linear_infinite]" />
          
          {/* Floating shapes */}
          <div className="absolute top-20 left-[10%] w-24 h-24 bg-primary/20 rotate-45 animate-[bounce_4s_ease-in-out_infinite]" />
          <div className="absolute top-40 right-[15%] w-16 h-16 rounded-full bg-accent/30 animate-[bounce_3s_ease-in-out_infinite_0.5s]" />
          <div className="absolute bottom-32 left-[20%] w-12 h-12 border-4 border-primary/30 rotate-12 animate-[bounce_5s_ease-in-out_infinite_1s]" />
          <div className="absolute top-1/2 right-[8%] w-20 h-20 border-4 border-accent/20 rounded-full animate-[pulse_3s_ease-in-out_infinite]" />
          
          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary/40 animate-float"
              style={{
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDuration: `${Math.random() * 10 + 10}s`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
          
          {/* Glowing orbs that drift */}
          <div className="absolute top-[20%] left-[15%] w-3 h-3 rounded-full bg-primary/60 blur-[2px] animate-drift" />
          <div className="absolute top-[60%] left-[70%] w-4 h-4 rounded-full bg-accent/50 blur-[3px] animate-drift-reverse" />
          <div className="absolute top-[40%] left-[85%] w-2 h-2 rounded-full bg-primary/50 blur-[1px] animate-drift" style={{ animationDelay: '3s' }} />
          <div className="absolute top-[75%] left-[25%] w-3 h-3 rounded-full bg-accent/40 blur-[2px] animate-drift-reverse" style={{ animationDelay: '5s' }} />
          <div className="absolute top-[15%] left-[60%] w-2 h-2 rounded-full bg-primary/70 blur-[1px] animate-drift" style={{ animationDelay: '7s' }} />
          
          {/* Gradient orbs */}
          <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-gradient-radial from-primary/8 to-transparent rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-radial from-accent/5 to-transparent rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:80px_80px] opacity-30" />
        </div>

        <div className="container px-4 relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-8">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-3 px-1">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse delay-100" />
                  <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse delay-200" />
                </div>
                <span className="text-sm font-mono uppercase tracking-[0.3em] text-muted-foreground">
                  Knowledge Awaits
                </span>
              </div>

              {/* Main Headline - Dramatic Typography */}
              <div className="space-y-2">
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-[0.85] tracking-tighter">
                  <span className="block text-foreground">{heroHeadline.split(heroHighlightText)[0]}</span>
                  <span 
                    className="block relative"
                    style={{ color: heroHighlightColor }}
                  >
                    {heroHighlightText}
                    <svg className="absolute -bottom-2 left-0 w-full h-4" viewBox="0 0 200 12" preserveAspectRatio="none">
                      <path d="M0,8 Q50,0 100,8 T200,8" fill="none" stroke={heroHighlightColor} strokeWidth="3" strokeLinecap="round" className="animate-[dash_2s_ease-in-out_infinite]" />
                    </svg>
                  </span>
                  <span className="block text-foreground">{heroHeadline.split(heroHighlightText)[1]}</span>
                </h1>
              </div>

              {/* Subheadline */}
              <p className="text-xl md:text-2xl text-muted-foreground max-w-xl leading-relaxed font-light">
                {heroSubheadline}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/courses">
                  <Button size="lg" className="h-16 px-10 text-lg font-bold bg-foreground text-background hover:bg-foreground/90 rounded-none group relative overflow-hidden">
                    <span className="relative z-10 flex items-center gap-2">
                      Explore Courses
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-16 px-10 text-lg font-bold rounded-none border-2 border-foreground hover:bg-foreground hover:text-background transition-colors">
                  <Compass className="mr-2 h-5 w-5" />
                  Take a Tour
                </Button>
              </div>
            </div>

            {/* Right Side - Abstract Knowledge Constellation */}
            <div className="lg:col-span-5 relative h-[500px] hidden lg:block">
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Central hub */}
                <div className="relative w-40 h-40">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent animate-[spin_20s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
                    <Hexagon className="w-16 h-16 text-primary" strokeWidth={1.5} />
                  </div>
                </div>
                
                {/* Orbiting elements */}
                <div className="absolute w-[400px] h-[400px] animate-[spin_30s_linear_infinite]">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-lg">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-card border-2 border-accent flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-lg">
                    <span className="text-2xl">💡</span>
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card border-2 border-accent flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🚀</span>
                  </div>
                </div>
                
                {/* Connection lines */}
                <svg className="absolute w-[400px] h-[400px] animate-[spin_30s_linear_infinite_reverse]" viewBox="0 0 400 400">
                  <circle cx="200" cy="200" r="150" fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="10 10" />
                  <circle cx="200" cy="200" r="100" fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="5 5" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-muted-foreground to-transparent" />
        </div>
      </section>

      {/* Featured Courses - Magazine Layout */}
      <section 
        ref={coursesAnimation.ref}
        className={`py-32 relative transition-all duration-1000 delay-200 ${
          coursesAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
        }`}
      >
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        
        <div className="container px-4">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-px bg-primary" />
                <span className="font-mono text-sm uppercase tracking-[0.2em] text-primary">Featured</span>
              </div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tight text-foreground">
                Trending<br />
                <span className="text-muted-foreground/50">Courses</span>
              </h2>
            </div>
            <Link to="/courses" className="group flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <span className="font-medium">View All</span>
              <ArrowUpRight className="h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

          {/* Course Grid - Asymmetric */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
            {featuredCourses.map((course, index) => (
              <Link 
                key={course.id} 
                to={`/courses/${course.slug}`}
                style={{ transitionDelay: coursesAnimation.isVisible ? `${index * 150}ms` : '0ms' }}
                className={`group relative overflow-hidden bg-card transition-all duration-700 ${
                  coursesAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                } ${index === 0 ? 'lg:col-span-2 lg:row-span-2' : ''}`}
              >
                <div className={`relative ${index === 0 ? 'h-[600px]' : 'h-[300px]'} overflow-hidden`}>
                  <img 
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/20 to-transparent" />
                  
                  {/* Content overlay */}
                  <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                    {/* Level badge */}
                    <div className="mb-4">
                      <span className="inline-block px-3 py-1 text-xs font-mono uppercase tracking-wider bg-primary text-primary-foreground">
                        {course.level}
                      </span>
                    </div>
                    
                    <h3 className={`font-black text-background mb-2 ${index === 0 ? 'text-4xl md:text-5xl' : 'text-2xl'}`}>
                      {course.title}
                    </h3>
                    <p className={`text-background/70 ${index === 0 ? 'text-lg max-w-lg' : 'text-sm'} line-clamp-2`}>
                      {course.description}
                    </p>
                    
                    {/* Arrow indicator */}
                    <div className="mt-4 flex items-center gap-2 text-primary">
                      <span className="text-sm font-medium">Start Learning</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                  
                  {/* Index number */}
                  <div className="absolute top-6 right-6 font-mono text-background/30 text-6xl font-black">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Journey CTA - Full Bleed */}
      <section 
        ref={ctaAnimation.ref}
        className={`relative py-40 overflow-hidden bg-foreground text-background transition-all duration-1000 delay-300 ${
          ctaAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
        }`}
      >
        {/* Background pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--background)/0.1)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--background)/0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-radial from-primary/20 to-transparent rounded-full blur-3xl" />
        </div>
        
        {/* Floating geometric accents */}
        <div className="absolute top-20 left-20">
          <Triangle className="w-16 h-16 text-primary/30 rotate-12" strokeWidth={1} />
        </div>
        <div className="absolute bottom-20 right-20">
          <Circle className="w-20 h-20 text-accent/30" strokeWidth={1} />
        </div>
        <div className="absolute top-1/3 right-1/4">
          <Square className="w-12 h-12 text-primary/20 rotate-45" strokeWidth={1} />
        </div>
        
        <div className="container px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Sparkle icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border border-background/20 mb-8">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[0.9]">
              Ready to<br />
              <span className="text-primary">Transform</span><br />
              Your Mind?
            </h2>
            
            <p className="text-xl md:text-2xl text-background/60 max-w-2xl mx-auto mb-12 leading-relaxed">
              Join a community of curious minds exploring knowledge through engaging visual experiences.
            </p>

            {/* Features strip */}
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-12">
              {["Free to Start", "Self-Paced", "Certificate Ready", "24/7 Access"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-background/70">
                  <Star className="w-4 h-4 text-primary fill-primary" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>

            <Link to="/courses">
              <Button size="lg" className="h-16 px-12 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-none group">
                Begin Your Journey
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - Minimal Editorial */}
      <footer 
        ref={footerAnimation.ref}
        className={`bg-background border-t border-border transition-all duration-1000 delay-200 ${
          footerAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container px-4">
          {/* Main Footer */}
          <div className="py-20 grid grid-cols-1 md:grid-cols-12 gap-12">
            {/* Brand Column */}
            <div className="md:col-span-4 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-foreground flex items-center justify-center">
                  <span className="text-2xl">📖</span>
                </div>
                <span className="text-2xl font-black text-foreground">{siteName}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                {siteDescription}
              </p>
              
              {/* Social Links */}
              <div className="flex gap-2">
                {socialLinks.twitter && (
                  <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialMediaClick('twitter')} 
                     className="w-10 h-10 border border-border flex items-center justify-center hover:bg-foreground hover:text-background hover:border-foreground transition-colors">
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialMediaClick('facebook')} 
                     className="w-10 h-10 border border-border flex items-center justify-center hover:bg-foreground hover:text-background hover:border-foreground transition-colors">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialMediaClick('instagram')} 
                     className="w-10 h-10 border border-border flex items-center justify-center hover:bg-foreground hover:text-background hover:border-foreground transition-colors">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialMediaClick('linkedin')} 
                     className="w-10 h-10 border border-border flex items-center justify-center hover:bg-foreground hover:text-background hover:border-foreground transition-colors">
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialMediaClick('youtube')} 
                     className="w-10 h-10 border border-border flex items-center justify-center hover:bg-foreground hover:text-background hover:border-foreground transition-colors">
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.github && (
                  <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" onClick={() => trackSocialMediaClick('github')} 
                     className="w-10 h-10 border border-border flex items-center justify-center hover:bg-foreground hover:text-background hover:border-foreground transition-colors">
                    <Github className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Links */}
            <div className="md:col-span-2">
              <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">Courses</h4>
              <ul className="space-y-4">
                {footerCategories.map((cat) => (
                  <li key={cat.slug}>
                    <Link to={`/courses/${cat.slug}`} className="text-foreground hover:text-primary transition-colors">
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">Company</h4>
              <ul className="space-y-4">
                <li><Link to="/about" className="text-foreground hover:text-primary transition-colors">About</Link></li>
                <li><Link to="/contact" className="text-foreground hover:text-primary transition-colors">Contact</Link></li>
                <li><Link to="/courses" className="text-foreground hover:text-primary transition-colors">All Courses</Link></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">Legal</h4>
              <ul className="space-y-4">
                <li><Link to="/privacy" className="text-foreground hover:text-primary transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="text-foreground hover:text-primary transition-colors">Terms</Link></li>
              </ul>
            </div>

            {/* Newsletter teaser */}
            <div className="md:col-span-2">
              <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">Stay Updated</h4>
              <p className="text-sm text-muted-foreground mb-4">Get notified about new courses and features.</p>
              <Link to="/contact">
                <Button variant="outline" size="sm" className="rounded-none border-foreground text-foreground hover:bg-foreground hover:text-background">
                  Subscribe
                </Button>
              </Link>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="py-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground font-mono">
              Crafted with passion for learning
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
