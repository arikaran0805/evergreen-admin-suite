import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Clock,
  Globe,
  Calendar,
  Award,
  Copy,
  Check,
  Edit2,
  Info,
} from "lucide-react";

interface Career {
  id: string;
  name: string;
  slug: string;
}

interface CourseMetadataSidebarProps {
  course: {
    id: string;
    name: string;
    slug: string;
    level?: string | null;
    learning_hours?: number | null;
    created_at?: string;
    updated_at?: string | null;
  };
  careers: Career[];
  estimatedDuration: string;
  lastUpdated?: string;
  isAdmin?: boolean;
  isModerator?: boolean;
  isHeaderVisible: boolean;
  showAnnouncement: boolean;
  onEdit?: () => void;
}

// Compact info row component
const InfoRow = ({
  icon: Icon,
  label,
  value,
  valueComponent,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  valueComponent?: React.ReactNode;
}) => (
  <div className="flex items-center gap-3 py-2">
    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    <span className="text-sm text-muted-foreground min-w-[80px]">{label}</span>
    {valueComponent || (
      <span className="text-sm font-medium text-foreground ml-auto text-right">
        {value}
      </span>
    )}
  </div>
);

export function CourseMetadataSidebar({
  course,
  careers,
  estimatedDuration,
  lastUpdated,
  isAdmin = false,
  isModerator = false,
  isHeaderVisible,
  showAnnouncement,
  onEdit,
}: CourseMetadataSidebarProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyUrl = async () => {
    const url = `${window.location.origin}/course/${course.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast({ title: "URL copied!", description: "Course URL copied to clipboard." });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  // Calculate sticky top position based on header visibility
  const stickyTopClass = isHeaderVisible
    ? showAnnouncement
      ? "top-[8.75rem]"
      : "top-[6.5rem]"
    : showAnnouncement
    ? "top-[4.75rem]"
    : "top-10";

  const canEdit = isAdmin || isModerator;

  return (
    <aside className="hidden xl:block w-[280px] flex-shrink-0">
      <div className={cn("sticky transition-[top] duration-200 ease-out", stickyTopClass)}>
        <div className="space-y-4 p-1 pb-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Course Info
                </CardTitle>
                {canEdit && onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onEdit}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="divide-y divide-border/50">
                <InfoRow
                  icon={TrendingUp}
                  label="Level"
                  value={course.level || "Beginner"}
                />
                <InfoRow
                  icon={Clock}
                  label="Duration"
                  value={
                    course.learning_hours
                      ? `${course.learning_hours} hours`
                      : estimatedDuration
                  }
                />
                <InfoRow icon={Globe} label="Language" value="English" />
                <InfoRow
                  icon={Calendar}
                  label="Updated"
                  value={
                    lastUpdated ||
                    formatDate(course.updated_at || course.created_at || new Date().toISOString())
                  }
                />
              </div>

              <Separator className="my-3" />

              {/* Career Paths */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Award className="h-4 w-4" />
                  <span>Career Path(s)</span>
                </div>
                {careers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {careers.map((career) => (
                      <Link key={career.id} to={`/career/${career.slug}`}>
                        <Badge
                          variant="secondary"
                          className="text-xs hover:bg-primary/10 cursor-pointer transition-colors"
                        >
                          {career.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No career path assigned
                  </p>
                )}
              </div>

              <Separator className="my-3" />

              {/* Course URL */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Course URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded truncate flex-1">
                    /course/{course.slug}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 hover:bg-primary/10"
                    onClick={copyUrl}
                  >
                    {copiedUrl ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </aside>
  );
}

export default CourseMetadataSidebar;
