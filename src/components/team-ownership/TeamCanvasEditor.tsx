import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit2, Archive, Check, X, Briefcase } from "lucide-react";
import type { Team, TeamCanvasData, SuperModeratorAssignment, CourseWithAssignments, UserProfile } from "./types";
import CanvasCareerNode from "./canvas/CanvasCareerNode";
import CanvasSuperModeratorLayer from "./canvas/CanvasSuperModeratorLayer";
import CanvasCourseLayer from "./canvas/CanvasCourseLayer";

interface TeamCanvasEditorProps {
  team: Team;
  onClose: () => void;
  onRefresh: () => void;
}

const TeamCanvasEditor = ({ team, onClose, onRefresh }: TeamCanvasEditorProps) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [canvasData, setCanvasData] = useState<TeamCanvasData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(team.name);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [availableCourses, setAvailableCourses] = useState<{ id: string; name: string; slug: string }[]>([]);

  const fetchCanvasData = async () => {
    try {
      setLoading(true);

      // Fetch all users with roles
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url");
      setAllUsers(usersData || []);

      // Fetch super moderators assigned to this team
      const { data: superModsData, error: superModsError } = await supabase
        .from("career_assignments")
        .select("*")
        .eq("team_id", team.id);

      if (superModsError) throw superModsError;

      const superModerators: SuperModeratorAssignment[] = (superModsData || []).map((sm) => ({
        ...sm,
        user: usersData?.find((u) => u.id === sm.user_id),
      }));

      // Fetch courses within this career
      const { data: careerCoursesData, error: careerCoursesError } = await supabase
        .from("career_courses")
        .select(`
          career_id,
          course:courses(id, name, slug, icon, status)
        `)
        .eq("career_id", team.career_id)
        .is("deleted_at", null);

      if (careerCoursesError) throw careerCoursesError;

      // Fetch course assignments for this team
      const { data: courseAssignmentsData, error: courseAssignmentsError } = await supabase
        .from("course_assignments")
        .select("*")
        .eq("team_id", team.id);

      if (courseAssignmentsError) throw courseAssignmentsError;

      // Filter courses that are assigned to this team
      const assignedCourseIds = new Set(courseAssignmentsData?.map((ca) => ca.course_id) || []);

      // Build courses with assignments
      const courses: CourseWithAssignments[] = (careerCoursesData || [])
        .filter((cc: any) => cc.course && assignedCourseIds.has(cc.course.id))
        .map((cc: any) => {
          const courseId = cc.course.id;
          const assignments = courseAssignmentsData?.filter((ca) => ca.course_id === courseId) || [];

          return {
            ...cc.course,
            career_id: cc.career_id,
            seniorModerators: assignments
              .filter((a) => a.role === "senior_moderator")
              .map((a) => ({
                ...a,
                user: usersData?.find((u) => u.id === a.user_id),
              })),
            moderators: assignments
              .filter((a) => a.role === "moderator")
              .map((a) => ({
                ...a,
                user: usersData?.find((u) => u.id === a.user_id),
              })),
          };
        });

      // Get available courses (not assigned to any team in this career)
      const allCareerCourses = (careerCoursesData || [])
        .filter((cc: any) => cc.course)
        .map((cc: any) => cc.course);

      // Check which courses are not assigned to this team
      const unassignedCourses = allCareerCourses.filter(
        (course: any) => !assignedCourseIds.has(course.id)
      );
      setAvailableCourses(unassignedCourses);

      setCanvasData({
        team: { ...team, career: team.career },
        superModerators,
        courses,
      });
    } catch (error: any) {
      console.error("Error fetching canvas data:", error);
      toast({
        title: "Error loading team data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanvasData();
  }, [team.id]);

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === team.name) {
      setIsEditing(false);
      setEditedName(team.name);
      return;
    }

    try {
      const { error } = await supabase
        .from("teams")
        .update({ name: editedName.trim() })
        .eq("id", team.id);

      if (error) throw error;

      toast({ title: "Team renamed" });
      setIsEditing(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error renaming team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleArchive = async () => {
    try {
      const { error } = await supabase
        .from("teams")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", team.id);

      if (error) throw error;

      toast({ title: "Team archived" });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error archiving team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!canvasData) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Failed to load team data</p>
        <Button onClick={onClose} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-64"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditedName(team.name);
                  }
                }}
              />
              <Button size="icon" variant="ghost" onClick={handleSaveName}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setEditedName(team.name);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onDoubleClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            <span className="text-sm">{team.career?.name}</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setShowArchiveDialog(true)}
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>
      </div>

      {/* Hierarchy Canvas */}
      <div className="card-premium rounded-xl p-8">
        <div className="space-y-8">
          {/* Career Node (read-only) */}
          <CanvasCareerNode career={team.career} />

          {/* Connector Line */}
          <div className="flex justify-center">
            <div className="w-0.5 h-8 bg-border" />
          </div>

          {/* Super Moderator Layer */}
          <CanvasSuperModeratorLayer
            teamId={team.id}
            careerId={team.career_id}
            superModerators={canvasData.superModerators}
            allUsers={allUsers}
            onRefresh={fetchCanvasData}
          />

          {/* Connector Line */}
          <div className="flex justify-center">
            <div className="w-0.5 h-8 bg-border" />
          </div>

          {/* Course Layer */}
          <CanvasCourseLayer
            teamId={team.id}
            courses={canvasData.courses}
            availableCourses={availableCourses}
            allUsers={allUsers}
            onRefresh={fetchCanvasData}
          />
        </div>
      </div>

      {/* Archive Confirmation */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Team?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive "{team.name}" and remove all assignments.
              {canvasData.courses.length > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This team has {canvasData.courses.length} course(s) assigned.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamCanvasEditor;
