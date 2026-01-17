import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import TeamCard from "@/components/team-ownership/TeamCard";
import TeamCanvasEditor from "@/components/team-ownership/TeamCanvasEditor";
import NewTeamCanvas from "@/components/team-ownership/NewTeamCanvas";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Users2 } from "lucide-react";
import type { Team, Career } from "@/components/team-ownership/types";

const AdminTeamOwnership = () => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showNewTeamCanvas, setShowNewTeamCanvas] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch careers
      const { data: careersData, error: careersError } = await supabase
        .from("careers")
        .select("id, name, slug, icon, color, status")
        .order("name");

      if (careersError) throw careersError;
      setCareers(careersData || []);

      // Fetch teams with career info
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          career_id,
          created_at,
          updated_at,
          archived_at
        `)
        .is("archived_at", null)
        .order("name");

      if (teamsError) throw teamsError;

      // Enrich teams with career info and counts
      const enrichedTeams: Team[] = await Promise.all(
        (teamsData || []).map(async (team) => {
          const career = careersData?.find((c) => c.id === team.career_id);

          // Get super moderator count for this team
          const { count: superModCount } = await supabase
            .from("career_assignments")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);

          // Get course count for this team
          const { count: courseCount } = await supabase
            .from("course_assignments")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);

          // Get senior moderator count for this team
          const { count: seniorModCount } = await supabase
            .from("course_assignments")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id)
            .eq("role", "senior_moderator");

          // Get moderator count for this team
          const { count: modCount } = await supabase
            .from("course_assignments")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id)
            .eq("role", "moderator");

          return {
            ...team,
            career: career || null,
            superModeratorCount: superModCount || 0,
            courseCount: courseCount || 0,
            seniorModeratorCount: seniorModCount || 0,
            moderatorCount: modCount || 0,
          };
        })
      );

      setTeams(enrichedTeams);
    } catch (error: any) {
      console.error("Error fetching teams:", error);
      toast({
        title: "Error loading teams",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const query = searchQuery.toLowerCase();
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        team.career?.name.toLowerCase().includes(query)
    );
  }, [teams, searchQuery]);

  // Group teams by career for the grid view
  const teamsByCareer = useMemo(() => {
    const grouped: Record<string, { career: Career; teams: Team[] }> = {};
    filteredTeams.forEach((team) => {
      if (team.career) {
        if (!grouped[team.career.id]) {
          grouped[team.career.id] = { career: team.career, teams: [] };
        }
        grouped[team.career.id].teams.push(team);
      }
    });
    return Object.values(grouped);
  }, [filteredTeams]);

  const handleTeamDoubleClick = (team: Team) => {
    setSelectedTeam(team);
  };

  const handleCloseCanvas = () => {
    setSelectedTeam(null);
    fetchData();
  };

  const handleNewTeamCreated = () => {
    setShowNewTeamCanvas(false);
    fetchData();
  };

  // Show New Team Canvas
  if (showNewTeamCanvas) {
    return (
      <NewTeamCanvas
        onClose={() => setShowNewTeamCanvas(false)}
        onTeamCreated={handleNewTeamCreated}
      />
    );
  }

  // Show existing Team Canvas Editor
  if (selectedTeam) {
    return (
      <TeamCanvasEditor
        team={selectedTeam}
        onClose={handleCloseCanvas}
        onRefresh={fetchData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Ownership</h1>
          <p className="text-muted-foreground mt-1">
            Manage team-based ownership of careers, courses, and content
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowNewTeamCanvas(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Team
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-premium rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{teams.length}</p>
              <p className="text-sm text-muted-foreground">Total Teams</p>
            </div>
          </div>
        </div>
        <div className="card-premium rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Users2 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{careers.length}</p>
              <p className="text-sm text-muted-foreground">Careers</p>
            </div>
          </div>
        </div>
        <div className="card-premium rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <Users2 className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {teams.reduce((sum, t) => sum + t.superModeratorCount, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Super Moderators</p>
            </div>
          </div>
        </div>
        <div className="card-premium rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Users2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {teams.reduce((sum, t) => sum + t.seniorModeratorCount + t.moderatorCount, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Course Team Members</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : teamsByCareer.length === 0 ? (
        <div className="text-center py-16">
          <Users2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No teams yet</h3>
          <p className="text-muted-foreground mb-6">
            Click the "New Team" button to create your first team
          </p>
          <Button onClick={() => setShowNewTeamCanvas(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Team
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {teamsByCareer.map(({ career, teams: careerTeams }) => (
            <div key={career.id} className="space-y-4">
              {/* Career Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: career.color || "hsl(var(--primary))" }}
                  >
                    {career.icon || career.name[0]}
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">{career.name}</h2>
                  <span className="text-sm text-muted-foreground">
                    ({careerTeams.length} team{careerTeams.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <button
                  onClick={() => setShowNewTeamCanvas(true)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Add new team"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {/* Team Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {careerTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onDoubleClick={() => handleTeamDoubleClick(team)}
                    onRefresh={fetchData}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTeamOwnership;
