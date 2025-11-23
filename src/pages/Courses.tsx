import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import BlogCard from "@/components/BlogCard";
import EmojiBackground from "@/components/EmojiBackground";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";

const Courses = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "All Courses - Emojilearn";
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
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

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="All Courses"
        description="Explore all our course categories"
      />
      <EmojiBackground />
      
      <div className="relative z-10">
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
      </div>
    </div>
  );
};

export default Courses;
