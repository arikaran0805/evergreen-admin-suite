import Header from "@/components/Header";
import BlogCard from "@/components/BlogCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

const Blogs = () => {
  const blogs = [
    {
      id: "1",
      title: "Getting Started with Modern Web Development",
      excerpt: "Learn the fundamentals of modern web development with React, TypeScript, and Tailwind CSS.",
      category: "Technology",
      readTime: 8,
      views: 1234,
      image: "/placeholder.svg",
      date: "Nov 20, 2025"
    },
    {
      id: "2",
      title: "10 Productivity Hacks for Remote Workers",
      excerpt: "Discover proven strategies to boost your productivity while working from home.",
      category: "Lifestyle",
      readTime: 6,
      views: 892,
      image: "/placeholder.svg",
      date: "Nov 18, 2025"
    },
    {
      id: "3",
      title: "The Future of Artificial Intelligence",
      excerpt: "Exploring how AI is transforming industries and what it means for the future.",
      category: "Technology",
      readTime: 10,
      views: 2156,
      image: "/placeholder.svg",
      date: "Nov 15, 2025"
    },
    {
      id: "4",
      title: "Building a Sustainable Business in 2025",
      excerpt: "Key strategies for creating an environmentally conscious and profitable business.",
      category: "Business",
      readTime: 7,
      views: 743,
      image: "/placeholder.svg",
      date: "Nov 12, 2025"
    },
    {
      id: "5",
      title: "Mastering Personal Finance: A Beginner's Guide",
      excerpt: "Essential tips and strategies for managing your money effectively.",
      category: "Lifestyle",
      readTime: 9,
      views: 1567,
      image: "/placeholder.svg",
      date: "Nov 10, 2025"
    },
    {
      id: "6",
      title: "The Science of Learning: How to Study Effectively",
      excerpt: "Evidence-based techniques to improve your learning and retention.",
      category: "Education",
      readTime: 12,
      views: 2034,
      image: "/placeholder.svg",
      date: "Nov 8, 2025"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />

      <main className="container px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">All Articles</h1>
            <p className="text-muted-foreground">Explore our collection of insightful articles</p>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                className="pl-10 border-2 border-primary/20 focus:border-primary/50"
              />
            </div>
            <Button variant="outline" className="border-2 border-primary/30 hover:bg-primary/10">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Blog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <BlogCard key={blog.id} {...blog} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Blogs;
