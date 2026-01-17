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
  Briefcase,
  GraduationCap,
  UserCog,
  Users,
  Plus,
  X,
  Star,
  Check,
  Shield,
} from "lucide-react";
import type { Career, UserProfile } from "./types";

interface SuperModeratorTemp {
  id: string;
  user_id: string;
  user?: UserProfile;
}

interface CourseWithModerators {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  seniorModerators: {
    id: string;
    user_id: string;
    is_default_manager: boolean;
    user?: UserProfile;
  }[];
  moderators: {
    id: string;
    user_id: string;
    user?: UserProfile;
  }[];
}

interface NewTeamCanvasProps {
  onClose: () => void;
  onTeamCreated: () => void;
}

const NewTeamCanvas = ({ onClose, onTeamCreated }: NewTeamCanvasProps) => {
  const { userId } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<"career" | "courses">("career");
  const [careers, setCareers] = useState<Career[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [teamName, setTeamName] = useState("");
  const [courses, setCourses] = useState<CourseWithModerators[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Super Moderators for the team (career level)
  const [superModerators, setSuperModerators] = useState<SuperModeratorTemp[]>([]);

  // Dialog states
  const [showAddSuperModDialog, setShowAddSuperModDialog] = useState(false);
  const [showAddSeniorModDialog, setShowAddSeniorModDialog] = useState<string | null>(null);
  const [showAddModeratorDialog, setShowAddModeratorDialog] = useState<string | null>(null);

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
      } finally {
        setLoading(false);
      }
    };

    fetchCareers();
  }, []);

  // Fetch courses and users when career is selected
  useEffect(() => {
    if (!selectedCareer) return;

    const fetchCoursesAndUsers = async () => {
      try {
        setLoading(true);

        // Fetch users
        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, email, full_name, avatar_url");
        setAllUsers(usersData || []);

        // Fetch courses for this career
        const { data: careerCoursesData, error } = await supabase
          .from("career_courses")
          .select(`
            course:courses(id, name, slug, icon, status)
          `)
          .eq("career_id", selectedCareer.id)
          .is("deleted_at", null);

        if (error) throw error;

        // Initialize courses with empty moderator arrays
        const coursesWithMods: CourseWithModerators[] = (careerCoursesData || [])
          .filter((cc: any) => cc.course)
          .map((cc: any) => ({
            ...cc.course,
            seniorModerators: [],
            moderators: [],
          }));

        setCourses(coursesWithMods);

        // Generate unique team name
        const baseName = `${selectedCareer.name} Team`;
        try {
          const { data: existingTeams, error: existingTeamsError } = await supabase
            .from("teams")
            .select("name")
            .eq("career_id", selectedCareer.id);

          if (existingTeamsError) throw existingTeamsError;

          const existingNames = new Set((existingTeams || []).map((t) => t.name));
          let uniqueName = baseName;
          let counter = 2;
          while (existingNames.has(uniqueName)) {
            uniqueName = `${baseName} ${counter}`;
            counter++;
          }
          setTeamName(uniqueName);
        } catch {
          // If we can't read existing teams (e.g. permissions), fall back to a random suffix
          setTeamName(`${baseName} ${Math.floor(1000 + Math.random() * 9000)}`);
        }
      } catch (error: any) {
        toast({
          title: "Error loading courses",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCoursesAndUsers();
  }, [selectedCareer]);

  const handleSelectCareer = (career: Career) => {
    setSelectedCareer(career);
    setStep("courses");
  };

  // Super Moderator handlers
  const handleAddSuperModerator = (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    setSuperModerators((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        user_id: userId,
        user,
      },
    ]);
    setShowAddSuperModDialog(false);
  };

  const handleRemoveSuperModerator = (id: string) => {
    setSuperModerators((prev) => prev.filter((sm) => sm.id !== id));
  };

  const getAvailableSuperModUsers = () => {
    const assignedIds = new Set(superModerators.map((sm) => sm.user_id));
    return allUsers.filter((u) => !assignedIds.has(u.id));
  };

  const handleAddModerator = (
    courseId: string,
    userId: string,
    role: "senior_moderator" | "moderator"
  ) => {
    const user = allUsers.find((u) => u.id === userId);
    
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;

        if (role === "senior_moderator") {
          const isFirst = course.seniorModerators.length === 0;
          return {
            ...course,
            seniorModerators: [
              ...course.seniorModerators,
              {
                id: `temp-${Date.now()}`,
                user_id: userId,
                is_default_manager: isFirst,
                user,
              },
            ],
          };
        } else {
          return {
            ...course,
            moderators: [
              ...course.moderators,
              {
                id: `temp-${Date.now()}`,
                user_id: userId,
                user,
              },
            ],
          };
        }
      })
    );

    setShowAddSeniorModDialog(null);
    setShowAddModeratorDialog(null);
  };

  const handleRemoveModerator = (
    courseId: string,
    moderatorId: string,
    role: "senior_moderator" | "moderator"
  ) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;

        if (role === "senior_moderator") {
          return {
            ...course,
            seniorModerators: course.seniorModerators.filter((sm) => sm.id !== moderatorId),
          };
        } else {
          return {
            ...course,
            moderators: course.moderators.filter((m) => m.id !== moderatorId),
          };
        }
      })
    );
  };

  const handleSetDefaultManager = (courseId: string, moderatorId: string) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id !== courseId) return course;

        return {
          ...course,
          seniorModerators: course.seniorModerators.map((sm) => ({
            ...sm,
            is_default_manager: sm.id === moderatorId,
          })),
        };
      })
    );
  };

  const handleSaveTeam = async () => {
    if (!selectedCareer || !teamName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a team name",
        variant: "destructive",
      });
      return;
    }

    // Check that at least one super moderator or course assignment exists
    const coursesWithAssignments = courses.filter(
      (c) => c.seniorModerators.length > 0 || c.moderators.length > 0
    );

    if (superModerators.length === 0 && coursesWithAssignments.length === 0) {
      toast({
        title: "No assignments",
        description: "Please assign at least one super moderator or course moderator",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Create the team (auto-resolve duplicate team names)
      const insertTeam = async (name: string) =>
        supabase
          .from("teams")
          .insert({
            name,
            career_id: selectedCareer.id,
            created_by: userId,
          })
          .select()
          .single();

      const isDuplicateTeamName = (err: any) => {
        const msg = `${err?.message || ""} ${err?.details || ""}`;
        return (
          !!err &&
          (err.code === "23505" || msg.includes("teams_name_career_id_key"))
        );
      };

      const baseName = teamName.trim();
      let nameToUse = baseName;
      let teamData: any = null;
      let teamError: any = null;

      // Try a few times in case of race conditions or manual duplicate names
      for (let attempt = 0; attempt < 5; attempt++) {
        ({ data: teamData, error: teamError } = await insertTeam(nameToUse));

        if (!isDuplicateTeamName(teamError)) break;

        // Pick a new suffix and retry
        const suffix = Math.floor(1000 + Math.random() * 9000);
        nameToUse = `${baseName} ${suffix}`;
      }

      if (teamError) throw teamError;
      if (!teamData) throw new Error("Failed to create team");

      // Keep UI in sync with the actual saved name
      if (nameToUse !== baseName) setTeamName(nameToUse);


      // Create career assignments for super moderators
      if (superModerators.length > 0) {
        const careerAssignments = superModerators.map((sm) => ({
          user_id: sm.user_id,
          career_id: selectedCareer.id,
          team_id: teamData.id,
          assigned_by: userId,
        }));

        const { error: careerAssignError } = await supabase
          .from("career_assignments")
          .insert(careerAssignments);

        if (careerAssignError) throw careerAssignError;
      }

      // Create course assignments
      const assignments: {
        user_id: string;
        course_id: string;
        team_id: string;
        role: "senior_moderator" | "moderator";
        is_default_manager: boolean;
        assigned_by: string;
      }[] = [];

      coursesWithAssignments.forEach((course) => {
        course.seniorModerators.forEach((sm) => {
          assignments.push({
            user_id: sm.user_id,
            course_id: course.id,
            team_id: teamData.id,
            role: "senior_moderator",
            is_default_manager: sm.is_default_manager,
            assigned_by: userId!,
          });
        });

        course.moderators.forEach((m) => {
          assignments.push({
            user_id: m.user_id,
            course_id: course.id,
            team_id: teamData.id,
            role: "moderator",
            is_default_manager: false,
            assigned_by: userId!,
          });
        });
      });

      if (assignments.length > 0) {
        const { error: assignError } = await supabase
          .from("course_assignments")
          .insert(assignments);

        if (assignError) throw assignError;
      }

      const totalAssignments = superModerators.length + assignments.length;
      toast({
        title: "Team created",
        description: `${nameToUse} has been created with ${totalAssignments} assignment(s)`,
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

  const getAvailableUsers = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return allUsers;

    const assignedIds = new Set([
      ...course.seniorModerators.map((sm) => sm.user_id),
      ...course.moderators.map((m) => m.user_id),
    ]);

    return allUsers.filter((u) => !assignedIds.has(u.id));
  };

  // Career Selection Step
  if (step === "career") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create New Team</h1>
            <p className="text-muted-foreground">Select a career to get started</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : careers.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No careers available</h3>
            <p className="text-muted-foreground">Create a career first to create teams</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {careers.map((career) => (
              <button
                key={career.id}
                onClick={() => handleSelectCareer(career)}
                className="card-premium rounded-xl p-6 text-left transition-all hover:border-primary/50 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg"
                    style={{ backgroundColor: career.color || "hsl(var(--primary))" }}
                  >
                    {career.icon || career.name[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {career.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{career.slug}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Courses & Assignments Step - Hierarchical Layout
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep("career")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="text-xl font-bold w-64"
            placeholder="Team name"
          />
        </div>
        <Button onClick={handleSaveTeam} disabled={saving}>
          {saving ? "Creating..." : "Create Team"}
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-6 py-12">
          <Skeleton className="h-20 w-64 rounded-xl" />
          <Skeleton className="h-32 w-96 rounded-xl" />
          <Skeleton className="h-48 w-full max-w-4xl rounded-xl" />
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {/* Career Node */}
          <div className="px-8 py-4 rounded-xl border-2 border-primary bg-card shadow-sm">
            <p className="text-xs font-medium text-primary uppercase tracking-wide text-center mb-1">
              CAREER
            </p>
            <h2 className="text-xl font-bold text-foreground text-center">
              {selectedCareer?.name}
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
                  <p className="text-muted-foreground">No courses in this career</p>
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
                                onClick={() => handleRemoveModerator(course.id, sm.id, "senior_moderator")}
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
                              onClick={() => handleRemoveModerator(course.id, mod.id, "moderator")}
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
      )}

      {/* Add Super Moderator Dialog */}
      <Dialog
        open={showAddSuperModDialog}
        onOpenChange={setShowAddSuperModDialog}
      >
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
    </div>
  );
};

export default NewTeamCanvas;
