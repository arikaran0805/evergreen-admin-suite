import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Github, Apple, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Auth = () => {
  const [searchParams] = useSearchParams();
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
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const urlSearchParams = new URLSearchParams(window.location.search);

    const type = hashParams.get("type") ?? urlSearchParams.get("type");
    const hasRecoveryTokens = hashParams.has("access_token") && hashParams.has("refresh_token");

    // Some email clients/redirects can drop the `type=recovery` param; tokens are a reliable fallback.
    return type === "recovery" || (hasRecoveryTokens && !type);
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Check if user was redirected due to role change
  const roleChangedReason = searchParams.get("reason") === "role_changed";

  useEffect(() => {
    const isRecoveryLink = () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const searchParams = new URLSearchParams(window.location.search);

      const type = hashParams.get("type") ?? searchParams.get("type");
      const hasRecoveryTokens = hashParams.has("access_token") && hashParams.has("refresh_token");

      return type === "recovery" || (hasRecoveryTokens && !type);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const recovery = event === "PASSWORD_RECOVERY" || isRecoveryLink();

      if (recovery) {
        setPasswordRecoveryMode(true);
        return;
      }

      if (session && event === "SIGNED_IN") {
        setTimeout(() => {
          checkRoleAndRedirect(session.user.id);
        }, 0);
      }
    });

    // Listener is set up; now check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isRecoveryLink()) {
        checkRoleAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkRoleAndRedirect = async (userId: string) => {
    try {
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "senior_moderator", "moderator"]);

      if (error) {
        toast({
          title: "Role Check Error",
          description: error.message,
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const roles = rolesData?.map(r => r.role) || [];

      // Priority: admin > senior_moderator > moderator > regular user
      if (roles.includes("admin")) {
        navigate("/admin/dashboard");
      } else if (roles.includes("senior_moderator")) {
        navigate("/senior-moderator/dashboard");
      } else if (roles.includes("moderator")) {
        navigate("/moderator/dashboard");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      navigate("/");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password updated!",
        description: "Now sign in manually with your new password.",
      });

      // After resetting, require a fresh manual login.
      await supabase.auth.signOut();
      setPasswordRecoveryMode(false);
      setNewPassword("");
      setConfirmNewPassword("");
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
        await checkRoleAndRedirect(data.user.id);
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
          await checkRoleAndRedirect(data.user!.id);
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
        redirectTo: `${window.location.origin}/reset-password`,
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

          {/* Role change notification alert */}
          {roleChangedReason && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your role has been changed by an administrator. Please log in again to continue with your updated permissions.
              </AlertDescription>
            </Alert>
          )}

          {passwordRecoveryMode ? (
            /* Set New Password Form */
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h1 className="text-3xl font-black text-foreground mb-2">Set New Password</h1>
                <p className="text-muted-foreground">
                  Enter your new password below.
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      className="h-12 pl-12 pr-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type={showConfirmNewPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      className="h-12 pl-12 pr-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-teal-500 text-primary-foreground font-bold shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? "Updating..." : "Update Password"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            </div>
          ) : forgotPasswordMode ? (
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
              {/* New user / Existing user toggle text */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <TabsList className="bg-transparent p-0 h-auto">
                  <TabsTrigger 
                    value="login" 
                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-muted-foreground p-0 font-normal"
                  >
                    Existing user?
                  </TabsTrigger>
                </TabsList>
                <TabsList className="bg-transparent p-0 h-auto">
                  <TabsTrigger 
                    value="login" 
                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none text-primary hover:text-primary/80 data-[state=active]:text-primary p-0 font-semibold cursor-pointer"
                  >
                    Sign In
                  </TabsTrigger>
                </TabsList>
                <span className="text-muted-foreground mx-2">|</span>
                <TabsList className="bg-transparent p-0 h-auto">
                  <TabsTrigger 
                    value="signup" 
                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-muted-foreground p-0 font-normal"
                  >
                    New user?
                  </TabsTrigger>
                </TabsList>
                <TabsList className="bg-transparent p-0 h-auto">
                  <TabsTrigger 
                    value="signup" 
                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none text-primary hover:text-primary/80 data-[state=active]:text-primary p-0 font-semibold cursor-pointer"
                  >
                    Register Now
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Google Login Button - Prominent */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-3 w-full h-14 rounded-full border border-border bg-card hover:bg-muted/50 hover:shadow-md transition-all duration-300 group mb-6"
              >
                {/* Google Colorful Logo */}
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-base font-medium text-foreground">Continue with Google</span>
              </button>

              {/* Other Social Login Icons - Circular */}
              <div className="flex items-center justify-center gap-4 mb-6">
                {/* Facebook */}
                <button
                  type="button"
                  onClick={() => handleSocialLoginComingSoon("Facebook")}
                  className="flex items-center justify-center w-12 h-12 rounded-full border border-border bg-card hover:bg-muted/50 hover:shadow-md transition-all duration-300"
                  title="Facebook"
                >
                  <svg className="h-6 w-6 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>

                {/* LinkedIn */}
                <button
                  type="button"
                  onClick={() => handleSocialLoginComingSoon("LinkedIn")}
                  className="flex items-center justify-center w-12 h-12 rounded-full border border-border bg-card hover:bg-muted/50 hover:shadow-md transition-all duration-300"
                  title="LinkedIn"
                >
                  <svg className="h-6 w-6 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </button>

                {/* GitHub */}
                <button
                  type="button"
                  onClick={() => handleSocialLoginComingSoon("GitHub")}
                  className="flex items-center justify-center w-12 h-12 rounded-full border border-border bg-card hover:bg-muted/50 hover:shadow-md transition-all duration-300"
                  title="GitHub"
                >
                  <Github className="h-6 w-6 text-foreground" />
                </button>

                {/* Apple */}
                <button
                  type="button"
                  onClick={() => handleSocialLoginComingSoon("Apple")}
                  className="flex items-center justify-center w-12 h-12 rounded-full border border-border bg-card hover:bg-muted/50 hover:shadow-md transition-all duration-300"
                  title="Apple"
                >
                  <Apple className="h-6 w-6 text-foreground" />
                </button>
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
