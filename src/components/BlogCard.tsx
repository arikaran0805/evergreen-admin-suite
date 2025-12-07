import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Users, ArrowRight, Star, Sparkles, TrendingUp, Flame } from "lucide-react";

interface BlogCardProps {
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
  author: string;
  slug?: string;
  lessonSlug?: string;
  views?: number;
  linkType?: "blog" | "category" | "lesson";
  rating?: number;
  level?: "Beginner" | "Intermediate" | "Advanced";
}

const BlogCard = ({ title, excerpt, category, image, date, author, slug, lessonSlug, views = 0, linkType = "blog", rating, level }: BlogCardProps) => {
  // Use actual enrollment count from views prop
  const learnersCount = views;
  const formattedLearners = learnersCount.toLocaleString();
  
  // Use actual rating or show nothing if no reviews
  const displayRating = rating && rating > 0 ? rating.toFixed(1) : null;
  
  // Level icons config
  const levelConfig = {
    Beginner: { icon: Sparkles },
    Intermediate: { icon: TrendingUp },
    Advanced: { icon: Flame },
  };

  const CardContent = (
    <Card className="group overflow-hidden border border-primary/10 hover:border-primary/30 transition-all duration-500 bg-gradient-to-br from-primary/5 via-background to-background hover:shadow-[0_20px_50px_hsl(var(--primary)/0.15)] backdrop-blur-sm hover:-translate-y-2 hover:scale-[1.02] cursor-pointer h-full flex flex-col">
      {/* Poster Image */}
      <div className="relative overflow-hidden aspect-[16/9]">
        <img
          src={image}
          alt={title}
          className="object-cover w-full h-full group-hover:scale-110 group-hover:rotate-1 transition-all duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Shimmer Effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-6 space-y-4 flex flex-col flex-1">
        <h3 className="text-xl font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300 animate-in fade-in slide-in-from-bottom-2">
          {title}
        </h3>

        {/* View Count and Rating Row */}
        <div className="flex items-center justify-between">
          {/* Enrolled Count - Left */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary transition-colors duration-300">
            <Users className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-300" />
            <span className="font-medium">{formattedLearners} enrolled</span>
          </div>

          {/* Rating - Right (only show if there are reviews) */}
          {linkType === "category" && displayRating && (
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-foreground">{displayRating}</span>
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 group-hover:scale-110 transition-transform duration-300" />
            </div>
          )}
        </div>

        <div 
          className="text-sm text-muted-foreground leading-relaxed line-clamp-3 group-hover:text-foreground/80 transition-colors duration-300 flex-1 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: excerpt }}
        />

        {/* Level Display Below Description */}
        {level && levelConfig[level] && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {(() => {
              const LevelIcon = levelConfig[level].icon;
              return (
                <>
                  <LevelIcon className="h-4 w-4" />
                  <span>{level}</span>
                </>
              );
            })()}
          </div>
        )}

        {/* Get Started Text Link */}
        <div className="flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all duration-300 mt-auto">
          <span>Get Started</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );

  if (slug) {
    let linkPath = `/blog/${slug}`;
    if (linkType === "category") {
      linkPath = `/course/${slug}`;
    } else if (linkType === "lesson" && lessonSlug) {
      linkPath = `/course/${slug}?lesson=${lessonSlug}`;
    }
    return (
      <Link to={linkPath} className="block">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
};

export default BlogCard;
