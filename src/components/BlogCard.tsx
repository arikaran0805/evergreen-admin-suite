import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Eye } from "lucide-react";

interface BlogCardProps {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: number;
  views: number;
  image: string;
  date: string;
}

const BlogCard = ({ id, title, excerpt, category, readTime, views, image, date }: BlogCardProps) => {
  return (
    <Link to={`/blog/${id}`}>
      <Card className="group overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-glow bg-card">
        {/* Image */}
        <div className="relative overflow-hidden aspect-video">
          <img
            src={image}
            alt={title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
              {category}
            </Badge>
            <span className="text-xs text-muted-foreground">{date}</span>
          </div>

          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>

          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {excerpt}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{readTime} min read</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{views} views</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default BlogCard;
