import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { GraduationCap, UserCog, Users, Plus, X, Star } from "lucide-react";
import type { CourseWithAssignments, CourseAssignment, UserProfile } from "../types";

interface CourseAssignmentGlobal {
  user_id: string;
  course_id: string;
  role: string;
}

interface CanvasCourseNodeProps {
  course: CourseWithAssignments;
  teamId: string;
  allUsers: UserProfile[];
  allCourseAssignments?: CourseAssignmentGlobal[];
  onRefresh: () => void;
}

const CanvasCourseNode = ({ course, teamId, allUsers, allCourseAssignments = [], onRefresh }: CanvasCourseNodeProps) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [showAddSeniorModDialog, setShowAddSeniorModDialog] = useState(false);
  const [showAddModeratorDialog, setShowAddModeratorDialog] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState<CourseAssignment | null>(null);

  // Filter available users for a specific role - checks ALL assignments across teams
  const getAvailableUsersForRole = (role: "senior_moderator" | "moderator") => {
    // Get users already assigned to this course with this role (across all teams)
    const assignedUserIds = new Set(
      allCourseAssignments
        .filter((a) => a.course_id === course.id && a.role === role)
        .map((a) => a.user_id)
    );

    return allUsers.filter((u) => !assignedUserIds.has(u.id));
  };

  const handleAddAssignment = async (selectedUserId: string, role: "senior_moderator" | "moderator") => {
    try {
      const isFirstSeniorMod = role === "senior_moderator" && course.seniorModerators.length === 0;

      const { error } = await supabase.from("course_assignments").insert({
        user_id: selectedUserId,
        course_id: course.id,
        team_id: teamId,
        role,
        is_default_manager: isFirstSeniorMod,
        assigned_by: userId,
      });

      if (error) throw error;

      toast({
        title: `${role === "senior_moderator" ? "Senior Moderator" : "Moderator"} assigned`,
      });
      setShowAddSeniorModDialog(false);
      setShowAddModeratorDialog(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error assigning user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveAssignment = async () => {
    if (!assignmentToRemove) return;

    // Check if removing last senior moderator
    if (
      assignmentToRemove.role === "senior_moderator" &&
      course.seniorModerators.length <= 1
    ) {
      toast({
        title: "Cannot remove",
        description: "A course must have at least one Senior Moderator",
        variant: "destructive",
      });
      setAssignmentToRemove(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("course_assignments")
        .delete()
        .eq("id", assignmentToRemove.id);

      if (error) throw error;

      toast({ title: "Assignment removed" });
      setAssignmentToRemove(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error removing assignment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSetDefaultManager = async (assignment: CourseAssignment) => {
    try {
      // First, unset all default managers for this course
      await supabase
        .from("course_assignments")
        .update({ is_default_manager: false })
        .eq("course_id", course.id)
        .eq("role", "senior_moderator");

      // Set the new default manager
      const { error } = await supabase
        .from("course_assignments")
        .update({ is_default_manager: true })
        .eq("id", assignment.id);

      if (error) throw error;

      toast({ title: "Default manager updated" });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error updating default manager",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="rounded-xl border bg-card p-4 space-y-4">
        {/* Course Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">{course.name}</h4>
            <p className="text-xs text-muted-foreground">{course.slug}</p>
          </div>
        </div>

        {/* Senior Moderators */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Senior Moderators
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {course.seniorModerators.map((sm) => (
              <div
                key={sm.id}
                className="group relative flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/5 border border-primary/20"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={sm.user?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {sm.user?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">
                  {sm.user?.full_name || sm.user?.email}
                </span>
                {sm.is_default_manager && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    <Star className="h-2.5 w-2.5 mr-0.5" />
                    Default
                  </Badge>
                )}
                <div className="absolute -top-2 -right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!sm.is_default_manager && (
                    <button
                      onClick={() => handleSetDefaultManager(sm)}
                      className="p-0.5 rounded-full bg-primary text-primary-foreground"
                      title="Set as default manager"
                    >
                      <Star className="h-2.5 w-2.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setAssignmentToRemove(sm)}
                    className="p-0.5 rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onDoubleClick={() => setShowAddSeniorModDialog(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span className="text-xs">Add</span>
            </button>
          </div>
        </div>

        {/* Connector Line */}
        <div className="flex justify-center">
          <div className="w-0.5 h-4 bg-border" />
        </div>

        {/* Moderators */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Moderators
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {course.moderators.map((mod) => (
              <div
                key={mod.id}
                className="group relative flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={mod.user?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {mod.user?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">
                  {mod.user?.full_name || mod.user?.email}
                </span>
                <button
                  onClick={() => setAssignmentToRemove(mod)}
                  className="absolute -top-2 -right-2 p-0.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
            <button
              onDoubleClick={() => setShowAddModeratorDialog(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span className="text-xs">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Senior Moderator Dialog */}
      <Dialog open={showAddSeniorModDialog} onOpenChange={setShowAddSeniorModDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Senior Moderator</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border">
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {getAvailableUsersForRole("senior_moderator").map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.email}
                    onSelect={() => handleAddAssignment(user.id, "senior_moderator")}
                    className="cursor-pointer"
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.full_name?.[0] || user.email[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">{user.full_name || user.email}</p>
                      {user.full_name && (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Add Moderator Dialog */}
      <Dialog open={showAddModeratorDialog} onOpenChange={setShowAddModeratorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Moderator</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border">
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {getAvailableUsersForRole("moderator").map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.email}
                    onSelect={() => handleAddAssignment(user.id, "moderator")}
                    className="cursor-pointer"
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.full_name?.[0] || user.email[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">{user.full_name || user.email}</p>
                      {user.full_name && (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!assignmentToRemove} onOpenChange={() => setAssignmentToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{assignmentToRemove?.user?.full_name || assignmentToRemove?.user?.email}" from this course?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAssignment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CanvasCourseNode;
