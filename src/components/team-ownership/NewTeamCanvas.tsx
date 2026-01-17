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
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Shield,
  UserCog,
  Users,
  Plus,
  MousePointerClick,
  Star,
} from "lucide-react";
import type { Career, Course, UserProfile, AppRole } from "./types";
import CanvasUserPoolSidebar from "./canvas/CanvasUserPoolSidebar";
import CanvasCareerSelector from "./canvas/CanvasCareerSelector";
import CanvasCourseSelector from "./canvas/CanvasCourseSelector";
import CanvasUserSelector from "./canvas/CanvasUserSelector";
import CanvasNode from "./canvas/CanvasNode";
import CanvasUserChip from "./canvas/CanvasUserChip";

interface UserWithRole extends UserProfile {
  role: AppRole;
}

interface SuperModeratorAssignment {
  id: string;
  user_id: string;
  user: UserProfile;
}

interface CourseAssignment {
  id: string;
  user_id: string;
  is_default_manager: boolean;
  user: UserProfile;
}

interface CourseNode {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  seniorModerators: CourseAssignment[];
  moderators: CourseAssignment[];
}

interface NewTeamCanvasProps {
  onClose: () => void;
  onTeamCreated: () => void;
}

const NewTeamCanvas = ({ onClose, onTeamCreated }: NewTeamCanvasProps) => {
  const { userId } = useAuth();
  const { toast } = useToast();

  // Core state
  const [teamName, setTeamName] = useState("New Team");
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
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

  // Drag state
  const [draggedUser, setDraggedUser] = useState<UserWithRole | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  // Fetch careers on mount
  useEffect(() => {
    const fetchCareers = async () => {
      try {
        // Fetch all careers (admin can see all statuses)
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
      } finally {
        setLoading(false);
      }
    };

    fetchCareers();
  }, []);

  // Fetch courses and users when career is selected
  useEffect(() => {
    if (!selectedCareer) return;

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

        // Merge users with roles (only include users with moderator-type roles)
        const usersWithRoles: UserWithRole[] = [];
        const roleMap = new Map<string, AppRole>();
        (rolesData || []).forEach((r) => roleMap.set(r.user_id, r.role));

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
          .filter((cc: any) => cc.course && cc.course.status === "published")
          .map((cc: any) => cc.course as Course);

        setAllCourses(coursesFromCareer);
        setTeamName(`${selectedCareer.name} Team`);
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
  }, [selectedCareer]);

  // Validation
  const canSave = useCallback(() => {
    if (!teamName.trim()) return false;
    if (!selectedCareer) return false;
    if (superModerators.length === 0) return false;
    // Every course must have at least one senior moderator with default manager
    for (const course of courses) {
      if (course.seniorModerators.length === 0) return false;
      if (!course.seniorModerators.some((sm) => sm.is_default_manager)) return false;
    }
    return true;
  }, [teamName, selectedCareer, superModerators, courses]);

  // Handlers
  const handleSelectCareer = (career: Career) => {
    setSelectedCareer(career);
    setShowCareerSelector(false);
    setSuperModerators([]);
    setCourses([]);
  };

  const handleAddSuperModerator = (user: UserWithRole) => {
    setSuperModerators((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, user_id: user.id, user },
    ]);
    setShowUserSelector(null);
  };

  const handleRemoveSuperModerator = (id: string) => {
    setSuperModerators((prev) => prev.filter((sm) => sm.id !== id));
  };

  const handleAddCourse = (course: Course) => {
    setCourses((prev) => [
      ...prev,
      { ...course, seniorModerators: [], moderators: [] },
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
            { id: `temp-${Date.now()}`, user_id: user.id, is_default_manager: isFirst, user },
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
        const newSeniorMods = course.seniorModerators.filter((sm) => sm.id !== assignmentId);
        // If removing the default manager, set the first remaining as default
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
            { id: `temp-${Date.now()}`, user_id: user.id, is_default_manager: false, user },
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

    // Validate drop zones based on user role
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
      // Check if already assigned
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

  // Save team
  const handleSaveTeam = async () => {
    if (!canSave() || !selectedCareer) return;

    try {
      setSaving(true);

      // Create the team
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

      // Create career assignments for super moderators
      const careerAssignments = superModerators.map((sm) => ({
        user_id: sm.user_id,
        career_id: selectedCareer.id,
        team_id: teamData.id,
        assigned_by: userId,
      }));

      if (careerAssignments.length > 0) {
        const { error: careerAssignError } = await supabase
          .from("career_assignments")
          .insert(careerAssignments);

        if (careerAssignError) throw careerAssignError;
      }

      // Create course assignments
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
          courseAssignments.push({
            user_id: sm.user_id,
            course_id: course.id,
            team_id: teamData.id,
            role: "senior_moderator",
            is_default_manager: sm.is_default_manager,
            assigned_by: userId!,
          });
        });

        course.moderators.forEach((m) => {
          courseAssignments.push({
            user_id: m.user_id,
            course_id: course.id,
            team_id: teamData.id,
            role: "moderator",
            is_default_manager: false,
            assigned_by: userId!,
          });
        });
      });

      if (courseAssignments.length > 0) {
        const { error: assignError } = await supabase
          .from("course_assignments")
          .insert(courseAssignments);

        if (assignError) throw assignError;
      }

      toast({
        title: "Team created",
        description: `${teamName} has been created successfully`,
      });

      onTeamCreated();
    } catch (error: any) {
      toast({
        title: "Error creating team",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                {selectedCareer.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSaveTeam} disabled={!canSave() || saving}>
              {saving ? "Creating..." : "Save Team"}
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
                {/* Career Node */}
                <CanvasNode
                  type="career"
                  title={selectedCareer.name}
                  badge="Career"
                  icon={selectedCareer.icon || selectedCareer.name[0]}
                  color={selectedCareer.color}
                >
                  <p className="text-sm text-muted-foreground">/{selectedCareer.slug}</p>
                </CanvasNode>

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
    </div>
  );
};

export default NewTeamCanvas;
