import { Link, useNavigate } from "react-router-dom";
import { Search, Menu, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

interface SiteSettings {
  site_name: string;
  logo_url?: string;
}

const Header = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ site_name: "BlogHub" });
  const navigate = useNavigate();
  const { toast } = useToast();

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
        .order('created_at', { ascending: false })
        .limit(5);

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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          {siteSettings.logo_url ? (
            <img 
              src={siteSettings.logo_url} 
              alt={siteSettings.site_name} 
              className="h-10 w-auto transition-transform group-hover:scale-105" 
            />
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow transition-transform group-hover:scale-105">
                <span className="text-xl font-bold text-primary-foreground">
                  {siteSettings.site_name.charAt(0)}
                </span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent hidden sm:inline">
                {siteSettings.site_name}
              </span>
            </>
          )}
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/category/${course.slug}`}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              {course.name}
            </Link>
          ))}
        </nav>

        {/* Search, User Menu and Mobile Menu */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hover:bg-secondary">
            <Search className="h-5 w-5" />
          </Button>

          {/* User Menu - Desktop */}
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              {isAdmin && (
                <Badge className="bg-primary text-primary-foreground shadow-md">
                  Admin
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-secondary">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          View Admin Site
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
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button asChild variant="default" className="hidden md:flex">
              <Link to="/auth">Login</Link>
            </Button>
          )}

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <nav className="flex flex-col gap-4 mt-8">
                {isAdmin && (
                  <div className="mb-2">
                    <Badge className="bg-primary text-primary-foreground shadow-md">
                      Admin User
                    </Badge>
                  </div>
                )}
                {courses.map((course) => (
                  <Link
                    key={course.id}
                    to={`/category/${course.slug}`}
                    className="text-base font-medium text-foreground/80 hover:text-primary transition-colors py-2"
                  >
                    {course.name}
                  </Link>
                ))}
                <div className="border-t pt-4 mt-4">
                  {user ? (
                    <>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 text-base font-medium text-foreground/80 hover:text-primary transition-colors py-2"
                        >
                          <User className="h-4 w-4" />
                          View Admin Site
                        </Link>
                      )}
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 text-base font-medium text-foreground/80 hover:text-primary transition-colors py-2"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-base font-medium text-foreground/80 hover:text-primary transition-colors py-2 w-full text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/auth"
                      className="text-base font-medium text-foreground/80 hover:text-primary transition-colors py-2 block"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
