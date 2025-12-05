import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import BlogCard from "@/components/BlogCard";
import SEOHead from "@/components/SEOHead";
import { Twitter, Facebook, Instagram, Linkedin, Youtube, Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSocialMediaClick } from "@/lib/socialAnalytics";

const Courses = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [footerCategories, setFooterCategories] = useState<any[]>([]);
  const [siteName, setSiteName] = useState("Emojilearn");
  const [logoUrl, setLogoUrl] = useState("");
  const [siteDescription, setSiteDescription] = useState("Master concepts through emoji-driven lessons.");
  const [socialLinks, setSocialLinks] = useState({
    twitter: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    github: "",
  });

  useEffect(() => {
    document.title = "All Courses - Emojilearn";
    fetchCourses();
    fetchFooterCategories();
    fetchSiteSettings();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, slug, description')
      .order('name', { ascending: true });

    if (!error && data) {
      const formattedCourses = data.map((category: any) => ({
        id: category.id,
        title: category.name,
        excerpt: category.description || 'Explore this course category and learn new skills',
        category: category.name,
        image: '/placeholder.svg',
        date: 'Course Category',
        author: 'Emojilearn Team',
        slug: category.slug
      }));
      setCourses(formattedCourses);
    }
    setLoading(false);
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
      .select('site_name, site_description, logo_url, twitter_url, facebook_url, instagram_url, linkedin_url, youtube_url, github_url')
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setSiteName(data.site_name || "Emojilearn");
      setSiteDescription(data.site_description || "Master concepts through emoji-driven lessons.");
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
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="All Courses"
        description="Explore all our course categories"
      />
      
      <Header />

        <div className="container px-4 py-16">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              All Courses
            </h1>
            <p className="text-lg text-muted-foreground">
              Browse through all our course categories and start learning
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 bg-card rounded-lg animate-pulse" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-6">No courses available yet</p>
              <Link to="/">
                <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  Back to Home
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <BlogCard key={course.id} {...course} linkType="category" />
              ))}
            </div>
          )}
        </div>

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
  );
};

export default Courses;
