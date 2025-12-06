import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import BlogCard from "@/components/BlogCard";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, X, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption = 'name' | 'date' | 'popularity';

const Courses = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    document.title = "All Courses - Emojilearn";
    fetchCourses();
    fetchPostCounts();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, slug, description, featured_image, created_at')
      .order('name', { ascending: true });

    if (!error && data) {
      const formattedCourses = data.map((category: any) => ({
        id: category.id,
        title: category.name,
        excerpt: category.description || 'Explore this course and learn new skills',
        category: category.name,
        image: category.featured_image || '/placeholder.svg',
        date: 'Course',
        author: 'Emojilearn Team',
        slug: category.slug,
        createdAt: new Date(category.created_at)
      }));
      setCourses(formattedCourses);
    }
    setLoading(false);
  };

  const fetchPostCounts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('category_id')
      .not('category_id', 'is', null);

    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach((post: any) => {
        counts[post.category_id] = (counts[post.category_id] || 0) + 1;
      });
      setPostCounts(counts);
    }
  };

  const filteredAndSortedCourses = courses
    .filter((course) => {
      const query = searchQuery.toLowerCase();
      return (
        course.title.toLowerCase().includes(query) ||
        course.excerpt.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'popularity':
          return (postCounts[b.id] || 0) - (postCounts[a.id] || 0);
        default:
          return 0;
      }
    });

  return (
    <Layout>
      <SEOHead 
        title="All Courses"
        description="Explore all our course categories"
      />

      <div className="container px-12 md:px-16 lg:px-24 py-16">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            All Courses
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Browse through all our course categories and start learning
          </p>
          
          {/* Search Bar and Sort */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search courses by name or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-12 text-base border-border/50 focus:border-primary"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[180px] h-12 bg-background">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="popularity">Popularity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-3">
              {filteredAndSortedCourses.length} {filteredAndSortedCourses.length === 1 ? 'course' : 'courses'} found for "{searchQuery}"
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredAndSortedCourses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-6">
              {searchQuery ? `No courses found for "${searchQuery}"` : "No courses available yet"}
            </p>
            {searchQuery ? (
              <Button onClick={() => setSearchQuery("")} variant="outline">
                Clear Search
              </Button>
            ) : (
              <Link to="/">
                <Button>Back to Home</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedCourses.map((course) => (
              <BlogCard key={course.id} {...course} linkType="category" />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Courses;
