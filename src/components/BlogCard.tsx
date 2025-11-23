import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";

interface BlogCardProps {
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
  author: string;
  slug?: string;
  views?: number;
  linkType?: "blog" | "category";
}

const BlogCard = ({ title, excerpt, category, image, date, author, slug, views = 0, linkType = "blog" }: BlogCardProps) => {
  // Calculate learners from views or use a simulated count
  const learnersCount = views > 0 ? views : Math.floor(Math.random() * 15000) + 5000;
  const formattedLearners = learnersCount.toLocaleString();

  const CardContent = (
    <Card className="group overflow-hidden border border-primary/10 hover:border-primary/30 transition-all duration-500 bg-gradient-to-br from-primary/5 via-background to-background hover:shadow-[0_20px_50px_hsl(var(--primary)/0.15)] backdrop-blur-sm hover:-translate-y-2 hover:scale-[1.02] cursor-pointer">
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
        
        {/* Category Badge on Image */}
        <div className="absolute top-3 left-3">
          <Badge className="bg-primary/90 text-primary-foreground border-0 shadow-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
            {category}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <h3 className="text-xl font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300 animate-in fade-in slide-in-from-bottom-2">
          {title}
        </h3>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 group-hover:text-foreground/80 transition-colors duration-300">
          {excerpt}
        </p>

        {/* Learners Count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary transition-colors duration-300">
          <Users className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-300" />
          <span className="font-medium">{formattedLearners} learners</span>
        </div>

        {/* Get Started Button */}
        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300 font-semibold group-hover:shadow-[0_4px_20px_hsl(var(--primary)/0.4)] relative overflow-hidden group/button"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            Get Started
            <ArrowRight className="h-4 w-4 group-hover/button:translate-x-1 transition-transform duration-300" />
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 -translate-x-full group-hover/button:translate-x-full transition-transform duration-700" />
        </Button>
      </div>
    </Card>
  );

  if (slug) {
    const linkPath = linkType === "category" ? `/category/${slug}` : `/blog/${slug}`;
    return (
      <Link to={linkPath} className="block">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
};

export default BlogCard;
