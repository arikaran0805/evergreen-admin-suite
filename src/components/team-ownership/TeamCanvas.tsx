import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Shield,
  UserCog,
  Users,
  Plus,
  MousePointerClick,
  Archive,
  Edit2,
} from "lucide-react";
import type { Career, Course, UserProfile, AppRole, Team } from "./types";
import CanvasUserPoolSidebar from "./canvas/CanvasUserPoolSidebar";
import CanvasCareerSelector from "./canvas/CanvasCareerSelector";
import CanvasCourseSelector from "./canvas/CanvasCourseSelector";
import CanvasUserSelector from "./canvas/CanvasUserSelector";
import CanvasUserChip from "./canvas/CanvasUserChip";

interface UserWithRole extends UserProfile {
  role: AppRole;
}

interface SuperModeratorAssignment {
  id: string;
  user_id: string;
  user: UserProfile;
  isNew?: boolean;
}

interface CourseAssignment {
  id: string;
  user_id: string;
  is_default_manager: boolean;
  user: UserProfile;
  isNew?: boolean;
}

interface CourseNode {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  seniorModerators: CourseAssignment[];
  moderators: CourseAssignment[];
  isNew?: boolean;
}

interface TeamCanvasProps {
  team?: Team | null;
  onClose: () => void;
  onSaved: () => void;
}

const TeamCanvas = ({ team, onClose, onSaved }: TeamCanvasProps) => {
  const isEditMode = !!team;
  const { userId } = useAuth();
  const { toast } = useToast();

  // Core state
  const [teamName, setTeamName] = useState(team?.name || "New Team");
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(team?.career || null);
  const [superModerators, setSuperModerators] = useState<SuperModeratorAssignment[]>([]);
  const [courses, setCourses] = useState<CourseNode[]>([]);

  // Data state
  const [careers, setCareers] = useState<Career[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showCareerSelector, setShowCareerSelector] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState<{
    type: "super_moderator" | "senior_moderator" | "moderator";
    courseId?: string;
  } | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Drag state
  const [draggedUser, setDraggedUser] = useState<UserWithRole | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  // Track original data for edit mode
  const [originalCareerId, setOriginalCareerId] = useState<string | null>(null);

  // Fetch careers on mount
  useEffect(() => {
    const fetchCareers = async () => {
      try {
        const { data, error } = await supabase
          .from("careers")
          .select("id, name, slug, icon, color, status")
          .order("name");

        if (error) throw error;
        setCareers(data || []);
      } catch (error: any) {
        toast({
          title: "Error loading careers",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    fetchCareers();
  }, []);

  // Load existing team data if editing
  useEffect(() => {
    if (!team) {
      setLoading(false);
      return;
    }

    const loadTeamData = async () => {
      try {
        setLoading(true);
        setOriginalCareerId(team.career_id);

        // Fetch all users with roles
        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, email, full_name, avatar_url");

        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("user_id, role");

        const roleMap = new Map<string, AppRole>();
        (rolesData || []).forEach((r) => roleMap.set(r.user_id, r.role));

        const usersWithRoles: UserWithRole[] = [];
        (usersData || []).forEach((user) => {
          const role = roleMap.get(user.id);
          if (role && ["super_moderator", "senior_moderator", "moderator"].includes(role)) {
            usersWithRoles.push({ ...user, role });
          }
        });
        setAllUsers(usersWithRoles);

        // Fetch super moderators
        const { data: superModsData } = await supabase
          .from("career_assignments")
          .select("*")
          .eq("team_id", team.id);

        const superMods: SuperModeratorAssignment[] = (superModsData || []).map((sm) => ({
          id: sm.id,
          user_id: sm.user_id,
          user: usersData?.find((u) => u.id === sm.user_id) || { id: sm.user_id, email: "Unknown", full_name: null, avatar_url: null },
        }));
        setSuperModerators(superMods);

        // Fetch courses for this career
        const { data: careerCoursesData } = await supabase
          .from("career_courses")
          .select(`course:courses(id, name, slug, icon, status)`)
          .eq("career_id", team.career_id)
          .is("deleted_at", null);

        const coursesFromCareer = (careerCoursesData || [])
          .filter((cc: any) => cc.course)
          .map((cc: any) => cc.course as Course);
        setAllCourses(coursesFromCareer);

        // Fetch course assignments
        const { data: courseAssignmentsData } = await supabase
          .from("course_assignments")
          .select("*")
          .eq("team_id", team.id);

        const assignedCourseIds = new Set((courseAssignmentsData || []).map((ca) => ca.course_id));

        const courseNodes: CourseNode[] = coursesFromCareer
          .filter((c) => assignedCourseIds.has(c.id))
          .map((course) => {
            const assignments = courseAssignmentsData?.filter((ca) => ca.course_id === course.id) || [];
            return {
              ...course,
              seniorModerators: assignments
                .filter((a) => a.role === "senior_moderator")
                .map((a) => ({
                  id: a.id,
                  user_id: a.user_id,
                  is_default_manager: a.is_default_manager,
                  user: usersData?.find((u) => u.id === a.user_id) || { id: a.user_id, email: "Unknown", full_name: null, avatar_url: null },
                })),
              moderators: assignments
                .filter((a) => a.role === "moderator")
                .map((a) => ({
                  id: a.id,
                  user_id: a.user_id,
                  is_default_manager: false,
                  user: usersData?.find((u) => u.id === a.user_id) || { id: a.user_id, email: "Unknown", full_name: null, avatar_url: null },
                })),
            };
          });
        setCourses(courseNodes);
        setSelectedCareer(team.career);
      } catch (error: any) {
        toast({
          title: "Error loading team",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [team?.id]);

  // Fetch courses and users when career is selected (for new teams or career change)
  useEffect(() => {
    if (!selectedCareer) return;

    // Skip if this is the original career in edit mode (data already loaded)
    if (isEditMode && selectedCareer.id === originalCareerId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch users with their roles
        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, email, full_name, avatar_url");

        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("user_id, role");

        const roleMap = new Map<string, AppRole>();
        (rolesData || []).forEach((r) => roleMap.set(r.user_id, r.role));

        const usersWithRoles: UserWithRole[] = [];
        (usersData || []).forEach((user) => {
          const role = roleMap.get(user.id);
          if (role && ["super_moderator", "senior_moderator", "moderator"].includes(role)) {
            usersWithRoles.push({ ...user, role });
          }
        });
        setAllUsers(usersWithRoles);

        // Fetch courses for this career
        const { data: careerCoursesData, error } = await supabase
          .from("career_courses")
          .select(`course:courses(id, name, slug, icon, status)`)
          .eq("career_id", selectedCareer.id)
          .is("deleted_at", null);

        if (error) throw error;

        const coursesFromCareer = (careerCoursesData || [])
          .filter((cc: any) => cc.course)
          .map((cc: any) => cc.course as Course);

        setAllCourses(coursesFromCareer);

        // If career changed, reset assignments
        if (!isEditMode || selectedCareer.id !== originalCareerId) {
          setTeamName(`${selectedCareer.name} Team`);
        }
      } catch (error: any) {
        toast({
          title: "Error loading data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCareer?.id, isEditMode, originalCareerId]);

  // Validation
  const canSave = useCallback(() => {
    if (!teamName.trim()) return false;
    if (!selectedCareer) return false;
    if (superModerators.length === 0) return false;
    for (const course of courses) {
      if (course.seniorModerators.length === 0) return false;
      if (!course.seniorModerators.some((sm) => sm.is_default_manager)) return false;
    }
    return true;
  }, [teamName, selectedCareer, superModerators, courses]);

  // Handlers
  const handleSelectCareer = (career: Career) => {
    // If changing career in edit mode, warn and reset assignments
    if (isEditMode && selectedCareer && career.id !== selectedCareer.id) {
      setSuperModerators([]);
      setCourses([]);
    }
    setSelectedCareer(career);
    setShowCareerSelector(false);
    if (!isEditMode) {
      setSuperModerators([]);
      setCourses([]);
    }
  };

  const handleAddSuperModerator = (user: UserWithRole) => {
    setSuperModerators((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, user_id: user.id, user, isNew: true },
    ]);
    setShowUserSelector(null);
  };

  const handleRemoveSuperModerator = (id: string) => {
    if (superModerators.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "A team must have at least one Super Moderator",
        variant: "destructive",
      });
      return;
    }
    setSuperModerators((prev) => prev.filter((sm) => sm.id !== id));
  };

  const handleAddCourse = (course: Course) => {
    setCourses((prev) => [
      ...prev,
      { ...course, seniorModerators: [], moderators: [], isNew: true },
    ]);
    setShowCourseSelector(false);
  };

  const handleRemoveCourse = (courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  const handleAddSeniorModerator = (courseId: string, user: UserWithRole) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;
        const isFirst = course.seniorModerators.length === 0;
        return {
          ...course,
          seniorModerators: [
            ...course.seniorModerators,
            { id: `temp-${Date.now()}`, user_id: user.id, is_default_manager: isFirst, user, isNew: true },
          ],
        };
      })
    );
    setShowUserSelector(null);
  };

  const handleRemoveSeniorModerator = (courseId: string, assignmentId: string) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;
        if (course.seniorModerators.length <= 1) {
          toast({
            title: "Cannot remove",
            description: "A course must have at least one Senior Moderator",
            variant: "destructive",
          });
          return course;
        }
        const newSeniorMods = course.seniorModerators.filter((sm) => sm.id !== assignmentId);
        if (newSeniorMods.length > 0 && !newSeniorMods.some((sm) => sm.is_default_manager)) {
          newSeniorMods[0].is_default_manager = true;
        }
        return { ...course, seniorModerators: newSeniorMods };
      })
    );
  };

  const handleSetDefaultManager = (courseId: string, assignmentId: string) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;
        return {
          ...course,
          seniorModerators: course.seniorModerators.map((sm) => ({
            ...sm,
            is_default_manager: sm.id === assignmentId,
          })),
        };
      })
    );
  };

  const handleAddModerator = (courseId: string, user: UserWithRole) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;
        return {
          ...course,
          moderators: [
            ...course.moderators,
            { id: `temp-${Date.now()}`, user_id: user.id, is_default_manager: false, user, isNew: true },
          ],
        };
      })
    );
    setShowUserSelector(null);
  };

  const handleRemoveModerator = (courseId: string, assignmentId: string) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;
        return {
          ...course,
          moderators: course.moderators.filter((m) => m.id !== assignmentId),
        };
      })
    );
  };

  // Drag & Drop handlers
  const handleDragStart = (user: UserWithRole, e: React.DragEvent) => {
    setDraggedUser(user);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (zone: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedUser) return;

    const [zoneType] = zone.split(":");
    if (
      (zoneType === "super_moderator" && draggedUser.role === "super_moderator") ||
      (zoneType === "senior_moderator" && draggedUser.role === "senior_moderator") ||
      (zoneType === "moderator" && draggedUser.role === "moderator")
    ) {
      setDragOverZone(zone);
    }
  };

  const handleDragLeave = () => {
    setDragOverZone(null);
  };

  const handleDrop = (zone: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(null);

    if (!draggedUser) return;

    const [zoneType, courseId] = zone.split(":");

    if (zoneType === "super_moderator" && draggedUser.role === "super_moderator") {
      if (!superModerators.some((sm) => sm.user_id === draggedUser.id)) {
        handleAddSuperModerator(draggedUser);
      }
    } else if (zoneType === "senior_moderator" && courseId && draggedUser.role === "senior_moderator") {
      const course = courses.find((c) => c.id === courseId);
      if (course && !course.seniorModerators.some((sm) => sm.user_id === draggedUser.id)) {
        handleAddSeniorModerator(courseId, draggedUser);
      }
    } else if (zoneType === "moderator" && courseId && draggedUser.role === "moderator") {
      const course = courses.find((c) => c.id === courseId);
      if (course && !course.moderators.some((m) => m.user_id === draggedUser.id)) {
        handleAddModerator(courseId, draggedUser);
      }
    }

    setDraggedUser(null);
  };

  // Save team (create or update)
  const handleSaveTeam = async () => {
    if (!canSave() || !selectedCareer) return;

    try {
      setSaving(true);

      let teamId = team?.id;

      if (isEditMode && team) {
        // Update team name and career if changed
        const { error: updateError } = await supabase
          .from("teams")
          .update({
            name: teamName.trim(),
            career_id: selectedCareer.id,
          })
          .eq("id", team.id);

        if (updateError) throw updateError;

        // If career changed, delete old assignments
        if (selectedCareer.id !== originalCareerId) {
          await supabase.from("career_assignments").delete().eq("team_id", team.id);
          await supabase.from("course_assignments").delete().eq("team_id", team.id);
        } else {
          // Delete removed super moderators
          const currentSuperModIds = superModerators.filter((sm) => !sm.isNew).map((sm) => sm.id);
          if (currentSuperModIds.length > 0) {
            await supabase
              .from("career_assignments")
              .delete()
              .eq("team_id", team.id)
              .not("id", "in", `(${currentSuperModIds.join(",")})`);
          } else {
            await supabase.from("career_assignments").delete().eq("team_id", team.id);
          }

          // Delete removed course assignments
          const currentAssignmentIds = courses.flatMap((c) => [
            ...c.seniorModerators.filter((sm) => !sm.isNew).map((sm) => sm.id),
            ...c.moderators.filter((m) => !m.isNew).map((m) => m.id),
          ]);
          const currentCourseIds = courses.filter((c) => !c.isNew).map((c) => c.id);
          
          // Remove course assignments for courses that were removed
          if (currentCourseIds.length > 0) {
            await supabase
              .from("course_assignments")
              .delete()
              .eq("team_id", team.id)
              .not("course_id", "in", `(${currentCourseIds.join(",")})`);
          }

          // Remove individual assignments that were deleted
          if (currentAssignmentIds.length > 0) {
            await supabase
              .from("course_assignments")
              .delete()
              .eq("team_id", team.id)
              .not("id", "in", `(${currentAssignmentIds.join(",")})`);
          }

          // Update default managers for existing assignments
          for (const course of courses) {
            for (const sm of course.seniorModerators) {
              if (!sm.isNew) {
                await supabase
                  .from("course_assignments")
                  .update({ is_default_manager: sm.is_default_manager })
                  .eq("id", sm.id);
              }
            }
          }
        }
      } else {
        // Create new team
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .insert({
            name: teamName.trim(),
            career_id: selectedCareer.id,
            created_by: userId,
          })
          .select()
          .single();

        if (teamError) throw teamError;
        teamId = teamData.id;
      }

      // Create new career assignments
      const newSuperMods = superModerators.filter((sm) => sm.isNew || selectedCareer.id !== originalCareerId);
      if (newSuperMods.length > 0) {
        const careerAssignments = newSuperMods.map((sm) => ({
          user_id: sm.user_id,
          career_id: selectedCareer.id,
          team_id: teamId,
          assigned_by: userId,
        }));

        const { error: careerAssignError } = await supabase
          .from("career_assignments")
          .insert(careerAssignments);

        if (careerAssignError) throw careerAssignError;
      }

      // Create new course assignments
      const courseAssignments: {
        user_id: string;
        course_id: string;
        team_id: string;
        role: "senior_moderator" | "moderator";
        is_default_manager: boolean;
        assigned_by: string;
      }[] = [];

      courses.forEach((course) => {
        course.seniorModerators.forEach((sm) => {
          if (sm.isNew || selectedCareer.id !== originalCareerId) {
            courseAssignments.push({
              user_id: sm.user_id,
              course_id: course.id,
              team_id: teamId!,
              role: "senior_moderator",
              is_default_manager: sm.is_default_manager,
              assigned_by: userId!,
            });
          }
        });

        course.moderators.forEach((m) => {
          if (m.isNew || selectedCareer.id !== originalCareerId) {
            courseAssignments.push({
              user_id: m.user_id,
              course_id: course.id,
              team_id: teamId!,
              role: "moderator",
              is_default_manager: false,
              assigned_by: userId!,
            });
          }
        });
      });

      if (courseAssignments.length > 0) {
        const { error: assignError } = await supabase
          .from("course_assignments")
          .insert(courseAssignments);

        if (assignError) throw assignError;
      }

      toast({
        title: isEditMode ? "Team updated" : "Team created",
        description: `${teamName} has been ${isEditMode ? "updated" : "created"} successfully`,
      });

      onSaved();
    } catch (error: any) {
      toast({
        title: `Error ${isEditMode ? "updating" : "creating"} team`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!team) return;

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

  // Get excluded user IDs for selectors
  const getExcludedSuperMods = () => superModerators.map((sm) => sm.user_id);
  const getExcludedForCourse = (courseId: string, type: "senior_moderator" | "moderator") => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return [];
    if (type === "senior_moderator") {
      return course.seniorModerators.map((sm) => sm.user_id);
    }
    return course.moderators.map((m) => m.user_id);
  };

  if (loading && !selectedCareer) {
    return (
      <div className="flex h-full">
        <div className="flex-1 p-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="text-xl font-bold h-10 w-72 bg-transparent border-transparent hover:border-border focus:border-border transition-colors"
              placeholder="Team name"
            />
            {selectedCareer && (
              <button
                onClick={() => setShowCareerSelector(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors group"
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">{selectedCareer.name}</span>
                <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isEditMode && (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setShowArchiveDialog(true)}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSaveTeam} disabled={!canSave() || saving}>
              {saving ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Save Team")}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <ScrollArea className="flex-1">
          <div className="p-8 min-h-full">
            {!selectedCareer ? (
              /* Empty Canvas - Double-click to add career */
              <div
                className="h-96 border-2 border-dashed border-muted-foreground/20 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                onDoubleClick={() => setShowCareerSelector(true)}
              >
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <MousePointerClick className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium">Double-click to add a Career</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  A team requires exactly one career
                </p>
              </div>
            ) : (
              /* Career selected - show hierarchy */
              <div className="space-y-6">
                {/* Career Node - Clickable to change */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowCareerSelector(true)}
                    className="flex items-center gap-4 px-6 py-4 rounded-xl border-2 shadow-sm hover:shadow-md transition-all group"
                    style={{
                      backgroundColor: `${selectedCareer.color}10`,
                      borderColor: selectedCareer.color,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: selectedCareer.color }}
                    >
                      {selectedCareer.icon || selectedCareer.name[0]}
                    </div>
                    <div className="text-left">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Career</p>
                      <h2 className="text-xl font-semibold text-foreground">{selectedCareer.name}</h2>
                    </div>
                    <Edit2 className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                  </button>
                </div>

                {/* Connector */}
                <div className="flex justify-center">
                  <div className="w-0.5 h-6 bg-gradient-to-b from-primary/30 to-purple-500/30" />
                </div>

                {/* Super Moderator Layer */}
                <div
                  className={`rounded-xl border-2 p-4 transition-all ${
                    dragOverZone === "super_moderator"
                      ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30"
                      : "border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-500/5"
                  }`}
                  onDoubleClick={() => setShowUserSelector({ type: "super_moderator" })}
                  onDragOver={handleDragOver("super_moderator")}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop("super_moderator")}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Super Moderators
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      Required
                    </Badge>
                  </div>

                  {superModerators.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground border-2 border-dashed border-purple-500/20 rounded-lg">
                      <p>Double-click or drag a Super Moderator here</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {superModerators.map((sm) => (
                        <CanvasUserChip
                          key={sm.id}
                          user={sm.user}
                          variant="super_moderator"
                          onRemove={() => handleRemoveSuperModerator(sm.id)}
                        />
                      ))}
                      <button
                        onClick={() => setShowUserSelector({ type: "super_moderator" })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-dashed border-purple-500/30 text-purple-500 hover:bg-purple-500/10 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">Add</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Connector to courses */}
                {superModerators.length > 0 && (
                  <>
                    <div className="flex justify-center">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-purple-500/30 to-accent/30" />
                    </div>

                    {/* Courses Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-accent" />
                          <span className="text-sm font-medium">Courses</span>
                        </div>
                        <button
                          onClick={() => setShowCourseSelector(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-accent/50 text-accent hover:bg-accent/10 transition-colors text-sm"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Course
                        </button>
                      </div>

                      {courses.length === 0 ? (
                        <div
                          className="py-8 text-center text-muted-foreground border-2 border-dashed border-accent/20 rounded-xl cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all"
                          onDoubleClick={() => setShowCourseSelector(true)}
                        >
                          <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Double-click to add a course</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {courses.map((course) => (
                            <div
                              key={course.id}
                              className="rounded-xl border-2 border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5 p-4 space-y-4"
                            >
                              {/* Course Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                                    <GraduationCap className="h-5 w-5 text-accent" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold">{course.name}</h4>
                                    <Badge variant="outline" className="text-[10px] h-5 mt-1">
                                      Course
                                    </Badge>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveCourse(course.id)}
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  ×
                                </button>
                              </div>

                              {/* Senior Moderators */}
                              <div
                                className={`rounded-lg border-2 p-3 transition-all ${
                                  dragOverZone === `senior_moderator:${course.id}`
                                    ? "border-blue-500 bg-blue-500/10"
                                    : "border-blue-500/20 bg-blue-500/5"
                                }`}
                                onDoubleClick={() =>
                                  setShowUserSelector({ type: "senior_moderator", courseId: course.id })
                                }
                                onDragOver={handleDragOver(`senior_moderator:${course.id}`)}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop(`senior_moderator:${course.id}`)}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <UserCog className="h-3.5 w-3.5 text-blue-500" />
                                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                    Senior Moderators
                                  </span>
                                </div>
                                {course.seniorModerators.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    Double-click or drag to add
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {course.seniorModerators.map((sm) => (
                                      <CanvasUserChip
                                        key={sm.id}
                                        user={sm.user}
                                        variant="senior_moderator"
                                        isDefaultManager={sm.is_default_manager}
                                        showDefaultAction
                                        onSetDefault={() => handleSetDefaultManager(course.id, sm.id)}
                                        onRemove={() => handleRemoveSeniorModerator(course.id, sm.id)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Moderators */}
                              <div
                                className={`rounded-lg border-2 p-3 transition-all ${
                                  dragOverZone === `moderator:${course.id}`
                                    ? "border-emerald-500 bg-emerald-500/10"
                                    : "border-emerald-500/20 bg-emerald-500/5"
                                }`}
                                onDoubleClick={() =>
                                  setShowUserSelector({ type: "moderator", courseId: course.id })
                                }
                                onDragOver={handleDragOver(`moderator:${course.id}`)}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop(`moderator:${course.id}`)}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="h-3.5 w-3.5 text-emerald-500" />
                                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                    Moderators
                                  </span>
                                </div>
                                {course.moderators.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    Double-click or drag to add
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {course.moderators.map((m) => (
                                      <CanvasUserChip
                                        key={m.id}
                                        user={m.user}
                                        variant="moderator"
                                        onRemove={() => handleRemoveModerator(course.id, m.id)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar - User Pool */}
      {selectedCareer && (
        <CanvasUserPoolSidebar users={allUsers} onDragStart={handleDragStart} />
      )}

      {/* Modals */}
      {showCareerSelector && (
        <CanvasCareerSelector
          careers={careers}
          onSelect={handleSelectCareer}
          onClose={() => setShowCareerSelector(false)}
        />
      )}

      {showCourseSelector && (
        <CanvasCourseSelector
          courses={allCourses}
          selectedCourseIds={courses.map((c) => c.id)}
          onSelect={handleAddCourse}
          onClose={() => setShowCourseSelector(false)}
        />
      )}

      {showUserSelector && (
        <CanvasUserSelector
          users={allUsers}
          excludeUserIds={
            showUserSelector.type === "super_moderator"
              ? getExcludedSuperMods()
              : getExcludedForCourse(showUserSelector.courseId!, showUserSelector.type)
          }
          targetRole={showUserSelector.type}
          onSelect={(user) => {
            if (showUserSelector.type === "super_moderator") {
              handleAddSuperModerator(user);
            } else if (showUserSelector.courseId) {
              if (showUserSelector.type === "senior_moderator") {
                handleAddSeniorModerator(showUserSelector.courseId, user);
              } else {
                handleAddModerator(showUserSelector.courseId, user);
              }
            }
          }}
          onClose={() => setShowUserSelector(null)}
        />
      )}

      {/* Archive Confirmation */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Team?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive "{teamName}" and remove all assignments.
              {courses.length > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This team has {courses.length} course(s) assigned.
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

export default TeamCanvas;
