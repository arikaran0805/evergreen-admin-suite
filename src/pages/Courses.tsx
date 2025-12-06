import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import BlogCard from "@/components/BlogCard";
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
      .from('courses')
      .select('id, name, slug, description, featured_image')
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
        slug: category.slug
      }));
      setCourses(formattedCourses);
    }
    setLoading(false);
  };

  return (
    <Layout>
      <SEOHead 
        title="All Courses"
        description="Explore all our course categories"
      />

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
    </Layout>
  );
};

export default Courses;
