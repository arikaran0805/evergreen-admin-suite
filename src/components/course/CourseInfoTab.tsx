import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  TrendingUp, 
  Clock, 
  Globe, 
  Calendar, 
  Award, 
  Copy, 
  Check, 
  BookOpen,
  User,
  Shield,
  FileText,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  History,
  Settings
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface Career {
  id: string;
  name: string;
  slug: string;
}

interface CourseInfoTabProps {
  course: {
    id: string;
    name: string;
    slug: string;
    level?: string | null;
    learning_hours?: number | null;
    created_at?: string;
    updated_at?: string | null;
    author_id?: string | null;
  };
  careers: Career[];
  totalPosts: number;
  totalLessons: number;
  estimatedDuration: string;
  lastUpdated?: string;
  authorName?: string;
  authorRole?: string;
}

// Info card component for metadata grid
const InfoCard = ({ 
  icon: Icon, 
  label, 
  value, 
  valueComponent 
}: { 
  icon: React.ElementType; 
  label: string; 
  value?: string; 
  valueComponent?: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
    <div className="p-2 rounded-md bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      {valueComponent || <p className="text-sm font-medium text-foreground truncate">{value}</p>}
    </div>
  </div>
);

// Section heading component
const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">
    {children}
  </h4>
);

export const CourseInfoTab = ({
  course,
  careers,
  totalPosts,
  totalLessons,
  estimatedDuration,
  lastUpdated,
  authorName = "Platform Team",
  authorRole = "Admin",
}: CourseInfoTabProps) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyUrl = async () => {
    const url = `${window.location.origin}/course/${course.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast({ title: "URL copied!", description: "Course URL copied to clipboard." });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Section 1: Key Course Metadata */}
      <section>
        <SectionHeading>Course Metadata</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard 
            icon={TrendingUp} 
            label="Difficulty Level" 
            value={course.level || "Beginner"} 
          />
          <InfoCard 
            icon={Clock} 
            label="Estimated Duration" 
            value={course.learning_hours ? `${course.learning_hours} hours` : estimatedDuration} 
          />
          <InfoCard 
            icon={Globe} 
            label="Language" 
            value="English" 
          />
          <InfoCard 
            icon={Calendar} 
            label="Last Updated" 
            value={lastUpdated || formatDate(course.updated_at || course.created_at)} 
          />
          <InfoCard 
            icon={Award} 
            label="Career Path(s)" 
            valueComponent={
              careers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {careers.map(career => (
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
                <p className="text-sm text-muted-foreground">No career path assigned</p>
              )
            }
          />
          <InfoCard 
            icon={FileText} 
            label="Course URL" 
            valueComponent={
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[140px]">
                  /course/{course.slug}
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 flex-shrink-0 hover:bg-primary/10" 
                  onClick={copyUrl}
                >
                  {copiedUrl ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
              </div>
            }
          />
        </div>
      </section>

      <Separator className="bg-border/50" />

      {/* Section 2: Prerequisites */}
      <section>
        <SectionHeading>Prerequisites</SectionHeading>
        <Card className="border-border/50 shadow-none bg-card/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              No prerequisites required for this course.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator className="bg-border/50" />

      {/* Section 3: Certification & Completion */}
      <section>
        <SectionHeading>Certification & Completion</SectionHeading>
        <Card className="border-border/50 shadow-none bg-card/50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary mt-0.5">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Certificate of Completion</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Available upon completing all course content
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary mt-0.5">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Completion Requirement</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All {totalPosts} posts across {totalLessons} lessons must be completed
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary mt-0.5">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Restart Policy</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Course restart is allowed. Progress will be reset but completion history is preserved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="bg-border/50" />

      {/* Section 4: Creator & Maintenance */}
      <section>
        <SectionHeading>Creator & Maintenance</SectionHeading>
        <Card className="border-border/50 shadow-none bg-card/50">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created by</p>
                  <p className="text-sm font-medium text-foreground">{authorRole}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Maintained by</p>
                  <p className="text-sm font-medium text-foreground">{authorName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Course Version</p>
                  <p className="text-sm font-medium text-foreground">1.0</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="bg-border/50" />

      {/* Section 5: Future Extension Placeholder */}
      <section>
        <SectionHeading>Version History</SectionHeading>
        <Card className="border-border/50 shadow-none bg-muted/20 border-dashed">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 text-muted-foreground">
              <History className="h-4 w-4" />
              <p className="text-sm">
                Version history and changelog will be available in a future update.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default CourseInfoTab;
