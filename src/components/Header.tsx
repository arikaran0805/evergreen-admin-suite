import { Link, useNavigate } from "react-router-dom";
import { Search, Menu, User, LogOut, Shield, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { SearchDialog } from "./SearchDialog";

interface SiteSettings {
  site_name: string;
  logo_url?: string;
}

interface HeaderProps {
  announcementVisible?: boolean;
}

const Header = ({ announcementVisible = false }: HeaderProps) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ site_name: "BlogHub" });
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    // Fetch site settings
    const fetchSiteSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('site_name, logo_url')
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setSiteSettings({
          site_name: data.site_name || "BlogHub",
          logo_url: data.logo_url || undefined
        });
      }
    };

    // Fetch categories
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, slug')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCourses(data);
      }
    };

    fetchSiteSettings();
    fetchCourses();

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

    if (!error && data) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged out",
        description: "You've been successfully logged out",
      });
      navigate("/");
    }
  };

  return (
    <header className={`fixed left-0 right-0 z-50 transition-all duration-300 ${announcementVisible ? 'top-9' : 'top-0'}`}>
      {/* Primary Header */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Brand */}
            <Link to="/" className="flex items-center gap-3 group relative">
              {siteSettings.logo_url ? (
                <img 
                  src={siteSettings.logo_url} 
                  alt={siteSettings.site_name} 
                  className="h-10 w-auto transition-all duration-300 group-hover:scale-105" 
                />
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full transition-all duration-300 group-hover:bg-primary/40" />
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <span className="text-2xl font-black text-primary-foreground tracking-tight">
                        {siteSettings.site_name.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-xl font-black tracking-tight text-foreground">
                      {siteSettings.site_name}
                    </span>
                    <span className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
                      Learn & Grow
                    </span>
                  </div>
                </>
              )}
            </Link>

            {/* Spacer to push icons to the right */}
            <div className="flex-1" />

            {/* Right Side Actions - Positioned to rightmost side */}
            <div className="flex items-center gap-1">
              {/* Search Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSearchOpen(true)}
                className="relative h-10 w-10 rounded-full hover:bg-muted transition-all duration-200"
              >
                <Search className="h-[18px] w-[18px] text-foreground/80" strokeWidth={1.5} />
              </Button>

              {/* Search Dialog */}
              <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
              
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* User Menu - Desktop */}
              {user ? (
                <div className="hidden md:flex items-center gap-1">
                  {isAdmin && (
                    <Button 
                      asChild
                      className="h-8 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
                    >
                      <Link to="/admin">
                        <Shield className="h-4 w-4" strokeWidth={1.5} />
                      </Link>
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-full hover:bg-muted transition-all duration-200"
                      >
                        <UserCircle className="h-[22px] w-[22px] text-foreground/80" strokeWidth={1.5} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">My Account</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {isAdmin && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link to="/admin" className="cursor-pointer">
                              <User className="mr-2 h-4 w-4" />
                              Admin Dashboard
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button 
                  asChild 
                  className="hidden md:flex h-9 px-5 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-semibold transition-all duration-300 hover:scale-105 shadow-lg text-sm"
                >
                  <Link to="/auth">Get Started</Link>
                </Button>
              )}

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl hover:bg-primary/10 group"
                  >
                    <Menu className="h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:text-primary" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 border-l border-border/50">
                  <div className="flex flex-col h-full">
                    <div className="py-6 border-b border-border/50">
                      <Link to="/" className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
                          <span className="text-lg font-black text-primary-foreground">
                            {siteSettings.site_name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-lg font-bold">{siteSettings.site_name}</span>
                      </Link>
                    </div>
                    
                    <nav className="flex-1 py-6">
                      {isAdmin && (
                        <div className="mb-4 px-2">
                          <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                            Admin User
                          </Badge>
                        </div>
                      )}
                      <div className="space-y-1">
                        {courses.map((course) => (
                          <Link
                            key={course.id}
                            to={`/course/${course.slug}`}
                            className="flex items-center px-4 py-3 text-base font-medium text-foreground/80 hover:text-foreground hover:bg-primary/10 rounded-xl transition-all duration-300"
                          >
                            {course.name}
                          </Link>
                        ))}
                        <Link
                          to="/courses"
                          className="flex items-center px-4 py-3 text-base font-medium text-foreground/80 hover:text-foreground hover:bg-primary/10 rounded-xl transition-all duration-300"
                        >
                          All Courses
                        </Link>
                      </div>
                    </nav>
                    
                    <div className="py-6 border-t border-border/50 space-y-2">
                      {user ? (
                        <>
                          {isAdmin && (
                            <Link
                              to="/admin"
                              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground/80 hover:text-foreground hover:bg-primary/10 rounded-xl transition-all duration-300"
                            >
                              <User className="h-5 w-5" />
                              Admin Dashboard
                            </Link>
                          )}
                          <Link
                            to="/profile"
                            className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground/80 hover:text-foreground hover:bg-primary/10 rounded-xl transition-all duration-300"
                          >
                            <User className="h-5 w-5" />
                            Profile
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 text-base font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-300 w-full text-left"
                          >
                            <LogOut className="h-5 w-5" />
                            Logout
                          </button>
                        </>
                      ) : (
                        <Button 
                          asChild 
                          className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold"
                        >
                          <Link to="/auth">Get Started</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Header - Courses Navigation */}
      <div className="hidden lg:block bg-muted border-b border-border">
        <div className="container mx-auto px-6 lg:px-12">
          <nav className="flex items-center gap-1 h-10 overflow-x-auto scrollbar-hide">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/course/${course.slug}`}
                className="relative px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-300 whitespace-nowrap group"
              >
                <span className="relative z-10">{course.name}</span>
                <span className="absolute inset-0 bg-primary/10 rounded-md scale-0 group-hover:scale-100 transition-transform duration-300" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
