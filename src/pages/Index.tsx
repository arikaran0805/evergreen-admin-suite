import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import BlogCard from "@/components/BlogCard";
import EmojiBackground from "@/components/EmojiBackground";
import { ArrowRight, TrendingUp, Sparkles } from "lucide-react";

const Index = () => {
  // Mock blog data
  const featuredBlogs = [
    {
      id: "1",
      title: "Getting Started with Modern Web Development",
      excerpt: "Learn the fundamentals of modern web development with React, TypeScript, and Tailwind CSS. A comprehensive guide for beginners.",
      category: "Technology",
      readTime: 8,
      views: 1234,
      image: "/placeholder.svg",
      date: "Nov 20, 2025"
    },
    {
      id: "2",
      title: "10 Productivity Hacks for Remote Workers",
      excerpt: "Discover proven strategies to boost your productivity while working from home. From time management to workspace optimization.",
      category: "Lifestyle",
      readTime: 6,
      views: 892,
      image: "/placeholder.svg",
      date: "Nov 18, 2025"
    },
    {
      id: "3",
      title: "The Future of Artificial Intelligence",
      excerpt: "Exploring how AI is transforming industries and what it means for the future of work, creativity, and human potential.",
      category: "Technology",
      readTime: 10,
      views: 2156,
      image: "/placeholder.svg",
      date: "Nov 15, 2025"
    }
  ];

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
              <span className="text-sm font-medium text-primary">Welcome to BlogHub</span>
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

        {/* Featured Posts */}
        <section className="container px-4 py-16">
          <div className="flex items-center gap-2 mb-8">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold">Trending Now</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredBlogs.map((blog) => (
              <BlogCard key={blog.id} {...blog} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/blogs">
              <Button size="lg" className="bg-gradient-primary shadow-elegant hover:shadow-glow">
                View All Articles
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                    <span className="text-xl font-bold text-primary-foreground">B</span>
                  </div>
                  <span className="text-xl font-bold text-primary">BlogHub</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Inspiring stories and ideas for curious minds.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Categories</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/category/technology" className="hover:text-primary">Technology</Link></li>
                  <li><Link to="/category/lifestyle" className="hover:text-primary">Lifestyle</Link></li>
                  <li><Link to="/category/business" className="hover:text-primary">Business</Link></li>
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
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="hover:text-primary">Terms of Service</Link></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
              <p>&copy; 2025 BlogHub. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
