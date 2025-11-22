import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

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
    <Card className="group overflow-hidden border border-primary/10 hover:border-primary/30 transition-all duration-500 bg-gradient-to-br from-primary/5 via-background to-background hover:shadow-[0_8px_30px_hsl(var(--primary)/0.12)] backdrop-blur-sm">
      {/* Poster Image */}
      <div className="relative overflow-hidden aspect-[16/9]">
        <img
          src={image}
          alt={title}
          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Category Badge on Image */}
        <div className="absolute top-3 left-3">
          <Badge className="bg-primary/90 text-primary-foreground border-0 shadow-lg backdrop-blur-sm">
            {category}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <h3 className="text-xl font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {excerpt}
        </p>

        {/* Learners Count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-medium">{formattedLearners} learners</span>
        </div>

        {/* Get Started Button */}
        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300 font-semibold group-hover:shadow-[0_4px_20px_hsl(var(--primary)/0.4)]"
        >
          Get Started
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
