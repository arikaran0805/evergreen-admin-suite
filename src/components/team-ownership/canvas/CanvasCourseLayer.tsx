import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { GraduationCap, Plus } from "lucide-react";
import type { CourseWithAssignments, UserProfile } from "../types";
import CanvasCourseNode from "./CanvasCourseNode";

interface CourseAssignmentGlobal {
  user_id: string;
  course_id: string;
  role: string;
}

interface CourseAssignment {
  id: string;
  user_id: string;
  course_id: string;
  team_id: string;
  role: string;
  is_default_manager: boolean;
  user?: UserProfile;
}

interface CanvasCourseLayerProps {
  teamId: string;
  courses: CourseWithAssignments[];
  availableCourses: { id: string; name: string; slug: string }[];
  allUsers: UserProfile[];
  allCourseAssignments?: CourseAssignmentGlobal[];
  onAssignmentAdded?: (courseId: string, userId: string, role: string, assignment: CourseAssignment) => void;
  onAssignmentRemoved?: (courseId: string, assignmentId: string, userId: string, role: string) => void;
  onDefaultManagerChanged?: (courseId: string, assignmentId: string) => void;
  onRefresh: () => void;
}

const CanvasCourseLayer = ({
  teamId,
  courses,
  availableCourses,
  allUsers,
  allCourseAssignments = [],
  onAssignmentAdded,
  onAssignmentRemoved,
  onDefaultManagerChanged,
  onRefresh,
}: CanvasCourseLayerProps) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [showAddCourseDialog, setShowAddCourseDialog] = useState(false);

  const handleAddCourse = async (courseId: string) => {
    try {
      // Create a placeholder course assignment with the admin as initial senior moderator
      // This links the course to this team
      const { error } = await supabase.from("course_assignments").insert({
        user_id: userId,
        course_id: courseId,
        team_id: teamId,
        role: "senior_moderator",
        is_default_manager: true,
        assigned_by: userId,
      });

      if (error) throw error;
      
      toast({
        title: "Course added",
        description: "Course assigned with you as the default Senior Moderator",
      });
      setShowAddCourseDialog(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error adding course",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="h-5 w-5 text-accent" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Courses
          </h3>
        </div>

        {courses.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">No courses assigned to this team</p>
            <button
              onDoubleClick={() => setShowAddCourseDialog(true)}
              className="flex items-center gap-2 px-6 py-4 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Double-click to assign a course</span>
            </button>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CanvasCourseNode
                  key={course.id}
                  course={course}
                  teamId={teamId}
                  allUsers={allUsers}
                  allCourseAssignments={allCourseAssignments}
                  onAssignmentAdded={onAssignmentAdded}
                  onAssignmentRemoved={onAssignmentRemoved}
                  onDefaultManagerChanged={onDefaultManagerChanged}
                  onRefresh={onRefresh}
                />
              ))}

              {/* Add Course Placeholder */}
              {availableCourses.length > 0 && (
                <button
                  onDoubleClick={() => setShowAddCourseDialog(true)}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors min-h-[200px]"
                >
                  <Plus className="h-8 w-8" />
                  <span className="text-sm">Double-click to add course</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Course Dialog */}
      <Dialog open={showAddCourseDialog} onOpenChange={setShowAddCourseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Course to Team</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border">
            <CommandInput placeholder="Search courses..." />
            <CommandList>
              <CommandEmpty>No available courses in this career.</CommandEmpty>
              <CommandGroup>
                {availableCourses.map((course) => (
                  <CommandItem
                    key={course.id}
                    value={course.name}
                    onSelect={() => handleAddCourse(course.id)}
                    className="cursor-pointer"
                  >
                    <GraduationCap className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{course.name}</p>
                      <p className="text-xs text-muted-foreground">{course.slug}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CanvasCourseLayer;
