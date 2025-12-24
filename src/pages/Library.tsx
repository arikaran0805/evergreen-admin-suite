import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock, Users, Search, Star } from "lucide-react";

interface CourseWithStats {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured_image: string | null;
  level: string | null;
  enrollmentCount: number;
  lessonCount: number;
  averageRating: number | null;
}

const Library = () => {
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Fetch all courses regardless of status on public pages
        const { data: coursesData, error } = await supabase
          .from("courses")
          .select("*")
          .order("name");

        if (error) throw error;

        // Get enrollment counts and lesson counts for each course
        const coursesWithStats = await Promise.all(
          (coursesData || []).map(async (course) => {
            const [{ count: enrollmentCount }, { count: lessonCount }, { data: reviews }] = await Promise.all([
              supabase
                .from("course_enrollments")
                .select("*", { count: "exact", head: true })
                .eq("course_id", course.id),
              supabase
                .from("posts")
                .select("*", { count: "exact", head: true })
                .eq("category_id", course.id),
              supabase
                .from("course_reviews")
                .select("rating")
                .eq("course_id", course.id),
            ]);

            const avgRating = reviews && reviews.length > 0
              ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
              : null;

            return {
              ...course,
              enrollmentCount: enrollmentCount || 0,
              lessonCount: lessonCount || 0,
              averageRating: avgRating,
            };
          })
        );

        setCourses(coursesWithStats);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const estimatedHours = (lessonCount: number) => Math.max(1, Math.round((lessonCount * 15) / 60));

  return (
    <Layout>
      <SEOHead
        title="Course Library | Browse All Courses"
        description="Explore our complete library of courses. Find the perfect course to advance your career."
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Course Library</h1>
          <p className="text-muted-foreground">
            Explore all available courses and start learning today
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-40 rounded-t-lg" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No courses found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Check back later for new courses"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(`/course/${course.slug}`)}
              >
                <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
                  {course.featured_image ? (
                    <img
                      src={course.featured_image}
                      alt={course.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                  {course.level && (
                    <Badge className="absolute top-3 left-3" variant="secondary">
                      {course.level}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {course.name}
                  </h3>
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {course.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {course.lessonCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {estimatedHours(course.lessonCount)}h
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {course.averageRating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {course.averageRating.toFixed(1)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {course.enrollmentCount}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Library;
