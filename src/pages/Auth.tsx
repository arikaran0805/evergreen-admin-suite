import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmojiBackground from "@/components/EmojiBackground";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Auth logic will be added when Cloud is enabled
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <EmojiBackground />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <span className="text-2xl font-bold text-primary-foreground">B</span>
          </div>
          <span className="text-2xl font-bold text-primary">BlogHub</span>
        </Link>

        <Card className="p-8 border-2 border-primary/20 shadow-elegant backdrop-blur-sm bg-card/95">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    className="border-2 border-primary/20 focus:border-primary/50"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="border-2 border-primary/20 focus:border-primary/50"
                    required
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-primary/30" />
                    <span className="text-muted-foreground">Remember me</span>
                  </label>
                  <a href="#" className="text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-primary shadow-elegant hover:shadow-glow"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            {/* Signup Form */}
            <TabsContent value="signup">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">First Name</label>
                    <Input
                      placeholder="John"
                      className="border-2 border-primary/20 focus:border-primary/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Last Name</label>
                    <Input
                      placeholder="Doe"
                      className="border-2 border-primary/20 focus:border-primary/50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    className="border-2 border-primary/20 focus:border-primary/50"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="border-2 border-primary/20 focus:border-primary/50"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="border-2 border-primary/20 focus:border-primary/50"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-primary shadow-elegant hover:shadow-glow"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-primary hover:underline">
              Back to Home
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
