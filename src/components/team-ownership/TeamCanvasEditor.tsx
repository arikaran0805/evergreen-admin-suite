import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ArrowLeft,
  Archive,
  Shield,
  GraduationCap,
  UserCog,
  Users,
  Plus,
  Star,
  X,
} from "lucide-react";
import type { Team, UserProfile, CourseWithAssignments, SuperModeratorAssignment } from "./types";

interface TeamCanvasEditorProps {
  team: Team;
  onClose: () => void;
  onRefresh: () => void;
}

const TeamCanvasEditor = ({ team, onClose, onRefresh }: TeamCanvasEditorProps) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [editedName, setEditedName] = useState(team.name);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Data states
  const [superModerators, setSuperModerators] = useState<SuperModeratorAssignment[]>([]);
  const [courses, setCourses] = useState<CourseWithAssignments[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Dialog states
  const [showAddSuperModDialog, setShowAddSuperModDialog] = useState(false);
  const [showAddSeniorModDialog, setShowAddSeniorModDialog] = useState<string | null>(null);
  const [showAddModeratorDialog, setShowAddModeratorDialog] = useState<string | null>(null);

  const fetchCanvasData = async () => {
    try {
      setLoading(true);

      // Fetch all users
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

      const superModeratorsList: SuperModeratorAssignment[] = (superModsData || []).map((sm) => ({
        ...sm,
        user: usersData?.find((u) => u.id === sm.user_id),
      }));
      setSuperModerators(superModeratorsList);

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

      // Build courses with assignments - show ALL courses from career (like create page)
      const coursesList: CourseWithAssignments[] = (careerCoursesData || [])
        .filter((cc: any) => cc.course)
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

      setCourses(coursesList);
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
      return;
    }

    try {
      const { error } = await supabase
        .from("teams")
        .update({ name: editedName.trim() })
        .eq("id", team.id);

      if (error) throw error;

      toast({ title: "Team updated" });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error updating team",
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

  // Super Moderator handlers
  const handleAddSuperModerator = async (selectedUserId: string) => {
    try {
      const { error } = await supabase.from("career_assignments").insert({
        user_id: selectedUserId,
        career_id: team.career_id,
        team_id: team.id,
        assigned_by: userId,
      });

      if (error) throw error;

      toast({ title: "Super Moderator added" });
      setShowAddSuperModDialog(false);
      fetchCanvasData();
    } catch (error: any) {
      toast({
        title: "Error adding super moderator",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveSuperModerator = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("career_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast({ title: "Super Moderator removed" });
      fetchCanvasData();
    } catch (error: any) {
      toast({
        title: "Error removing super moderator",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getAvailableSuperModUsers = () => {
    const assignedIds = new Set(superModerators.map((sm) => sm.user_id));
    return allUsers.filter((u) => !assignedIds.has(u.id));
  };

  // Course assignment handlers
  const handleAddModerator = async (
    courseId: string,
    selectedUserId: string,
    role: "senior_moderator" | "moderator"
  ) => {
    try {
      const course = courses.find((c) => c.id === courseId);
      const isFirstSenior = role === "senior_moderator" && course?.seniorModerators.length === 0;

      const { error } = await supabase.from("course_assignments").insert({
        user_id: selectedUserId,
        course_id: courseId,
        team_id: team.id,
        role,
        is_default_manager: isFirstSenior,
        assigned_by: userId,
      });

      if (error) throw error;

      toast({ title: `${role === "senior_moderator" ? "Senior Moderator" : "Moderator"} added` });
      setShowAddSeniorModDialog(null);
      setShowAddModeratorDialog(null);
      fetchCanvasData();
    } catch (error: any) {
      toast({
        title: "Error adding moderator",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveModerator = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("course_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast({ title: "Assignment removed" });
      fetchCanvasData();
    } catch (error: any) {
      toast({
        title: "Error removing assignment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSetDefaultManager = async (courseId: string, assignmentId: string) => {
    try {
      // First, unset all default managers for this course
      const { error: unsetError } = await supabase
        .from("course_assignments")
        .update({ is_default_manager: false })
        .eq("course_id", courseId)
        .eq("team_id", team.id)
        .eq("role", "senior_moderator");

      if (unsetError) throw unsetError;

      // Set the new default manager
      const { error: setError } = await supabase
        .from("course_assignments")
        .update({ is_default_manager: true })
        .eq("id", assignmentId);

      if (setError) throw setError;

      toast({ title: "Default manager updated" });
      fetchCanvasData();
    } catch (error: any) {
      toast({
        title: "Error updating default manager",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getAvailableUsers = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return allUsers;

    const assignedIds = new Set([
      ...course.seniorModerators.map((sm) => sm.user_id),
      ...course.moderators.map((m) => m.user_id),
    ]);

    return allUsers.filter((u) => !assignedIds.has(u.id));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex flex-col items-center gap-6 py-12">
          <Skeleton className="h-20 w-64 rounded-xl" />
          <Skeleton className="h-32 w-96 rounded-xl" />
          <Skeleton className="h-48 w-full max-w-4xl rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - same style as create team */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="text-xl font-bold w-64"
            placeholder="Team name"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSaveName}
            disabled={!editedName.trim() || editedName === team.name}
          >
            Update Team
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setShowArchiveDialog(true)}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
        </div>
      </div>

      {/* Hierarchical Canvas */}
      <div className="flex flex-col items-center">
        {/* Career Node */}
        <div className="px-8 py-4 rounded-xl border-2 border-primary bg-card shadow-sm">
          <p className="text-xs font-medium text-primary uppercase tracking-wide text-center mb-1">
            CAREER
          </p>
          <h2 className="text-xl font-bold text-foreground text-center">
            {team.career?.name}
          </h2>
        </div>

        {/* Connector Line */}
        <div className="w-0.5 h-8 bg-border" />

        {/* Super Moderators Section */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              SUPER MODERATORS
            </h3>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {superModerators.map((sm) => (
              <div
                key={sm.id}
                className="group relative flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-primary/30 bg-primary/5"
              >
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarImage src={sm.user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {sm.user?.full_name?.[0] || sm.user?.email?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {sm.user?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">{sm.user?.email}</p>
                </div>
                <button
                  onClick={() => handleRemoveSuperModerator(sm.id)}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* Add Super Moderator Button */}
            <button
              onDoubleClick={() => setShowAddSuperModDialog(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm">Double-click to add</span>
            </button>
          </div>
        </div>

        {/* Connector Line */}
        <div className="w-0.5 h-8 bg-border" />

        {/* Courses Section */}
        <div className="w-full max-w-6xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <GraduationCap className="h-5 w-5 text-accent" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              COURSES
            </h3>
          </div>

          {courses.length === 0 ? (
            <div className="flex justify-center">
              <div className="px-16 py-12 rounded-xl border-2 border-dashed border-muted-foreground/30 text-center">
                <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No courses assigned to this team</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => (
                <div key={course.id} className="rounded-xl border bg-card p-5 space-y-4">
                  {/* Course Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                      <GraduationCap className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground">{course.name}</h4>
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
                          className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={sm.user?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {sm.user?.full_name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {sm.user?.full_name || sm.user?.email}
                          </span>
                          {sm.is_default_manager && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                              <Star className="h-3 w-3 mr-0.5" />
                              Default
                            </Badge>
                          )}
                          <div className="absolute -top-2 -right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!sm.is_default_manager && (
                              <button
                                onClick={() => handleSetDefaultManager(course.id, sm.id)}
                                className="p-1 rounded-full bg-primary text-primary-foreground"
                                title="Set as default manager"
                              >
                                <Star className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveModerator(sm.id)}
                              className="p-1 rounded-full bg-destructive text-destructive-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowAddSeniorModDialog(course.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="text-sm">Add</span>
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
                          className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={mod.user?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {mod.user?.full_name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {mod.user?.full_name || mod.user?.email}
                          </span>
                          <button
                            onClick={() => handleRemoveModerator(mod.id)}
                            className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowAddModeratorDialog(course.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="text-sm">Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Super Moderator Dialog */}
      <Dialog open={showAddSuperModDialog} onOpenChange={setShowAddSuperModDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Super Moderator</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border">
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {getAvailableSuperModUsers().map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.email}
                    onSelect={() => handleAddSuperModerator(user.id)}
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

      {/* Add Senior Moderator Dialog */}
      <Dialog
        open={!!showAddSeniorModDialog}
        onOpenChange={() => setShowAddSeniorModDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Senior Moderator</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border">
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {showAddSeniorModDialog &&
                  getAvailableUsers(showAddSeniorModDialog).map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.email}
                      onSelect={() =>
                        handleAddModerator(showAddSeniorModDialog, user.id, "senior_moderator")
                      }
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
      <Dialog
        open={!!showAddModeratorDialog}
        onOpenChange={() => setShowAddModeratorDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Moderator</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border">
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {showAddModeratorDialog &&
                  getAvailableUsers(showAddModeratorDialog).map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.email}
                      onSelect={() =>
                        handleAddModerator(showAddModeratorDialog, user.id, "moderator")
                      }
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

      {/* Archive Confirmation */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Team?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Archiving <strong>"{team.name}"</strong> will:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Hide the team from the active teams list</li>
                  <li>Keep all super moderator and course assignments intact (not deleted)</li>
                  <li>Preserve historical data for auditing purposes</li>
                  <li>Allow the team to be restored later if needed</li>
                </ul>
                <p className="text-sm">
                  The team members will no longer see this team in their dashboard, but their
                  permissions on courses remain unchanged until manually removed.
                </p>
                {(superModerators.length > 0 || courses.some(c => c.seniorModerators.length > 0 || c.moderators.length > 0)) && (
                  <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                    ⚠️ This team has active assignments ({superModerators.length} super moderator(s),{" "}
                    {courses.reduce((acc, c) => acc + c.seniorModerators.length + c.moderators.length, 0)} course assignment(s))
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamCanvasEditor;
