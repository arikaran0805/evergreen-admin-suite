import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Chrome, Apple, Github, Linkedin } from "lucide-react";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkAdminAndRedirect(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && event === "SIGNED_IN") {
        await checkAdminAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminAndRedirect = async (userId: string) => {
    try {
      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        toast({
          title: "Role Check Error",
          description: error.message,
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (roleData) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      navigate("/");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });

      if (data.user) {
        await checkAdminAndRedirect(data.user.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: `${firstName} ${lastName}`,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      if (data.user) {
        setTimeout(async () => {
          await checkAdminAndRedirect(data.user!.id);
        }, 500);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast({
        title: "Reset email sent!",
        description: "Check your email for password reset instructions.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google.",
        variant: "destructive",
      });
    }
  };

  const handleSocialLoginComingSoon = (provider: string) => {
    toast({
      title: `${provider} login coming soon`,
      description: `${provider} authentication will be available soon.`,
    });
  };

  const SocialButton = ({ icon: Icon, label, onClick, className = "" }: { icon: any; label: string; onClick: () => void; className?: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all duration-300 group ${className}`}
    >
      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
    </button>
  );

  // Facebook icon component
  const FacebookIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );

  return (
    <div className="min-h-screen flex bg-background overflow-hidden">
      {/* Left Side - Branding & Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-gradient-radial from-primary/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-radial from-accent/10 to-transparent rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:60px_60px] opacity-20" />
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <span className="text-3xl font-black text-primary-foreground">B</span>
            </div>
            <span className="text-3xl font-black text-foreground">BlogHub</span>
          </Link>

          {/* Illustration */}
          <div className="relative w-80 h-96 mb-12">
            {/* Card stack */}
            <div className="absolute -left-4 top-6 w-full h-full bg-muted/50 rounded-3xl border border-border rotate-[-8deg]" />
            <div className="absolute -right-4 top-3 w-full h-full bg-muted/30 rounded-3xl border border-border rotate-[5deg]" />
            
            {/* Main card */}
            <div className="relative w-full h-full bg-card rounded-3xl border-2 border-primary/20 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
              <div className="relative p-8 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-primary/60" />
                  <div className="w-3 h-3 rounded-full bg-accent/60" />
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="h-4 bg-foreground/10 rounded w-3/4" />
                  <div className="h-4 bg-foreground/10 rounded w-full" />
                  <div className="h-4 bg-foreground/10 rounded w-5/6" />
                  <div className="h-4 bg-foreground/10 rounded w-2/3" />
                  <div className="h-4 bg-foreground/10 rounded w-4/5" />
                </div>
                
                <div className="absolute bottom-8 right-8 text-7xl opacity-20">📚</div>
                
                <div className="mt-auto">
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-primary to-accent rounded-full" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">Your learning journey starts here</p>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-8 w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center animate-[bounce_3s_ease-in-out_infinite]">
              <span className="text-4xl">🎯</span>
            </div>
            <div className="absolute -bottom-6 -left-4 w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center animate-[bounce_4s_ease-in-out_infinite_0.5s]">
              <span className="text-3xl">✨</span>
            </div>
          </div>

          {/* Tagline */}
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-foreground mb-3">Master Any Subject</h2>
            <p className="text-muted-foreground">
              Learn through emojis, visuals, and stories that spark clarity and deeper understanding.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <Link to="/" className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <span className="text-2xl font-bold text-primary-foreground">B</span>
            </div>
            <span className="text-2xl font-bold text-foreground">BlogHub</span>
          </Link>

          {forgotPasswordMode ? (
            /* Forgot Password Form */
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h1 className="text-3xl font-black text-foreground mb-2">Reset Password</h1>
                <p className="text-muted-foreground">
                  {resetEmailSent 
                    ? "Check your email for reset instructions."
                    : "Enter your email and we'll send you a reset link."}
                </p>
              </div>

              {!resetEmailSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        className="h-12 pl-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-teal-500 text-primary-foreground font-bold shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              ) : (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-4">📧</div>
                  <p className="text-foreground font-medium">Email sent successfully!</p>
                  <p className="text-sm text-muted-foreground mt-2">Please check your inbox and spam folder.</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setForgotPasswordMode(false);
                  setResetEmailSent(false);
                }}
                className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Back to login
              </button>
            </div>
          ) : (
            /* Login/Signup Forms */
            <Tabs defaultValue="login" className="w-full">
              <div className="text-center lg:text-left mb-6">
                <h1 className="text-3xl font-black text-foreground mb-2">Welcome</h1>
                <p className="text-muted-foreground">Sign in to continue your learning journey</p>
              </div>

              <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-muted/50 p-1 mb-6">
                <TabsTrigger value="login" className="rounded-lg font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <SocialButton icon={Chrome} label="Google" onClick={handleGoogleLogin} />
                <SocialButton icon={Apple} label="Apple" onClick={() => handleSocialLoginComingSoon("Apple")} />
                <SocialButton icon={FacebookIcon} label="Facebook" onClick={() => handleSocialLoginComingSoon("Facebook")} />
                <SocialButton icon={Linkedin} label="LinkedIn" onClick={() => handleSocialLoginComingSoon("LinkedIn")} />
              </div>

              <div className="w-full mb-6">
                <SocialButton icon={Github} label="Continue with GitHub" onClick={() => handleSocialLoginComingSoon("GitHub")} />
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background px-4 text-muted-foreground">or continue with email</span>
                </div>
              </div>

              {/* Login Form */}
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        className="h-12 pl-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-12 pl-12 pr-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                      <span className="text-sm text-muted-foreground">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotPasswordMode(true)}
                      className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-teal-500 text-primary-foreground font-bold shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Form */}
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">First Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          placeholder="John"
                          className="h-12 pl-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Last Name</label>
                      <Input
                        placeholder="Doe"
                        className="h-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        className="h-12 pl-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-12 pl-12 pr-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-12 pl-12 pr-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-teal-500 text-primary-foreground font-bold shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By signing up, you agree to our{" "}
                    <Link to="/terms" className="text-primary hover:underline">Terms</Link>
                    {" "}and{" "}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowRight className="h-4 w-4 rotate-180" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
