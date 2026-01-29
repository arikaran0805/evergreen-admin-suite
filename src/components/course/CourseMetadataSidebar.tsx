import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  BookOpen,
  User,
  Users,
  ExternalLink,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface Career {
  id: string;
  name: string;
  slug: string;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface LinkedPrerequisite {
  id: string;
  prerequisite_course_id: string | null;
  prerequisite_text: string | null;
  linkedCourse?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  isCompleted?: boolean;
  progressPercentage?: number;
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
  linkedPrerequisites?: LinkedPrerequisite[];
  creator?: TeamMember | null;
  maintenanceTeam?: TeamMember[];
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

// Team member display component
const TeamMemberRow = ({ member, roleLabel }: { member: TeamMember; roleLabel?: string }) => (
  <div className="flex items-center gap-2 py-1.5">
    <Avatar className="h-6 w-6 border border-border/50">
      <AvatarImage src={member.avatar_url || undefined} />
      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
        {member.full_name?.charAt(0)?.toUpperCase() || "U"}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-foreground truncate">
        {member.full_name || "Unknown"}
      </p>
      {roleLabel && (
        <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
      )}
    </div>
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
  linkedPrerequisites = [],
  creator,
  maintenanceTeam = [],
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
        <div className="space-y-4 pl-3 pr-1 pb-6">
          {/* Course Info Card */}
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

          {/* Prerequisites Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Prerequisites
                {linkedPrerequisites.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                    {linkedPrerequisites.filter(p => p.isCompleted).length}/{linkedPrerequisites.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {linkedPrerequisites.length > 0 ? (
                <ul className="space-y-2">
                  {linkedPrerequisites.map((prereq) => (
                    <li key={prereq.id} className="text-xs flex items-start gap-2">
                      {prereq.linkedCourse ? (
                        // Linked course prerequisite with completion status
                        prereq.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )
                      ) : (
                        // Text prerequisite - just a bullet
                        <span className="text-primary mt-0.5 w-4 text-center flex-shrink-0">•</span>
                      )}
                      <div className="flex-1 min-w-0">
                        {prereq.linkedCourse ? (
                          <div className="flex flex-col gap-0.5">
                            <Link 
                              to={`/course/${prereq.linkedCourse.slug}`}
                              className={cn(
                                "hover:underline flex items-center gap-1 group",
                                prereq.isCompleted ? "text-primary" : "text-foreground"
                              )}
                            >
                              <span className={cn(
                                "truncate",
                                prereq.isCompleted && "line-through opacity-70"
                              )}>
                                {prereq.linkedCourse.name}
                              </span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </Link>
                            {prereq.progressPercentage !== undefined && prereq.progressPercentage > 0 && !prereq.isCompleted && (
                              <div className="flex items-center gap-1.5">
                                <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary/60 rounded-full transition-all"
                                    style={{ width: `${prereq.progressPercentage}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {prereq.progressPercentage}%
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{prereq.prerequisite_text}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No prerequisites required
                </p>
              )}
            </CardContent>
          </Card>

          {/* Creator & Maintenance Team Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Team
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              {/* Creator */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Created by
                </p>
                {creator ? (
                  <TeamMemberRow member={creator} />
                ) : (
                  <div className="flex items-center gap-2 py-1.5">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">Platform Team</p>
                  </div>
                )}
              </div>

              {/* Maintenance Team */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Maintained by
                </p>
                {maintenanceTeam.length > 0 ? (
                  <div className="space-y-1">
                    {maintenanceTeam.slice(0, 3).map((member) => (
                      <TeamMemberRow 
                        key={member.id} 
                        member={member} 
                        roleLabel={
                          member.role === "senior_moderator" 
                            ? "Senior Mod" 
                            : member.role === "moderator" 
                            ? "Moderator" 
                            : undefined
                        }
                      />
                    ))}
                    {maintenanceTeam.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-8">
                        +{maintenanceTeam.length - 3} more
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1.5">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">Platform Team</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </aside>
  );
}

export default CourseMetadataSidebar;
