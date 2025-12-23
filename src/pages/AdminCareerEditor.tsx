import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, Save, X, BookOpen, Sparkles, MousePointerClick,
  GripVertical, Trash2, Settings, Palette, ChevronRight, Search,
  Target, TrendingUp, Zap
} from "lucide-react";
import * as Icons from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

// Types
interface SkillNode {
  id: string;
  name: string;
  weight: number;
  icon: string;
  color: string;
  x: number;
  y: number;
  courses: { courseId: string; contribution: number }[];
}

interface SkillContribution {
  skill_name: string;
  contribution: number;
}

interface Course {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

// Constants
const skillIconOptions = [
  "Code2", "Database", "BarChart3", "Brain", "Cpu", "Terminal",
  "Server", "Cloud", "Layers", "Zap", "Target", "Rocket"
];

const skillColorOptions = [
  { name: "Emerald", bg: "bg-emerald-500/20", border: "border-emerald-500/50", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/30" },
  { name: "Blue", bg: "bg-blue-500/20", border: "border-blue-500/50", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-500/30" },
  { name: "Purple", bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-600 dark:text-purple-400", ring: "ring-purple-500/30" },
  { name: "Orange", bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-600 dark:text-orange-400", ring: "ring-orange-500/30" },
  { name: "Pink", bg: "bg-pink-500/20", border: "border-pink-500/50", text: "text-pink-600 dark:text-pink-400", ring: "ring-pink-500/30" },
  { name: "Teal", bg: "bg-teal-500/20", border: "border-teal-500/50", text: "text-teal-600 dark:text-teal-400", ring: "ring-teal-500/30" },
  { name: "Rose", bg: "bg-rose-500/20", border: "border-rose-500/50", text: "text-rose-600 dark:text-rose-400", ring: "ring-rose-500/30" },
  { name: "Sky", bg: "bg-sky-500/20", border: "border-sky-500/50", text: "text-sky-600 dark:text-sky-400", ring: "ring-sky-500/30" },
];

const careerColorOptions = [
  { label: "Purple", value: "bg-purple-500/10 text-purple-500 border-purple-500/30" },
  { label: "Blue", value: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  { label: "Orange", value: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
  { label: "Green", value: "bg-green-500/10 text-green-500 border-green-500/30" },
  { label: "Pink", value: "bg-pink-500/10 text-pink-500 border-pink-500/30" },
  { label: "Teal", value: "bg-teal-500/10 text-teal-500 border-teal-500/30" },
];

const careerIconOptions = [
  "Brain", "Database", "Layers", "BarChart3", "Code2", "Briefcase", 
  "Server", "Cloud", "Cpu", "Terminal", "Rocket", "Target"
];

const AdminCareerEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Core state
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [activeTab, setActiveTab] = useState("canvas");
  
  // Career form state
  const [careerName, setCareerName] = useState("");
  const [careerSlug, setCareerSlug] = useState("");
  const [careerDescription, setCareerDescription] = useState("");
  const [careerIcon, setCareerIcon] = useState("Briefcase");
  const [careerColor, setCareerColor] = useState(careerColorOptions[0].value);
  const [displayOrder, setDisplayOrder] = useState(0);
  
  // Canvas state
  const [skillNodes, setSkillNodes] = useState<SkillNode[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [draggingSkill, setDraggingSkill] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Course drag state
  const [draggingCourse, setDraggingCourse] = useState<string | null>(null);
  const [dropTargetSkill, setDropTargetSkill] = useState<string | null>(null);
  
  // Dialogs
  const [skillEditorOpen, setSkillEditorOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillNode | null>(null);
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [pendingCourseMapping, setPendingCourseMapping] = useState<{
    skillId: string;
    courseId: string;
  } | null>(null);
  const [contributionValue, setContributionValue] = useState(50);

  // Initialize
  useEffect(() => {
    checkAdminAccess();
    fetchCourses();
    if (id) {
      fetchCareer(id);
    } else {
      fetchCareersCount();
    }
  }, [id]);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) {
        toast({ title: "Access Denied", variant: "destructive" });
        navigate("/");
      }
    } catch (error) {
      navigate("/");
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, slug, description")
        .order("name");
      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchCareersCount = async () => {
    try {
      const { count } = await supabase
        .from("careers")
        .select("*", { count: "exact", head: true });
      setDisplayOrder((count || 0) + 1);
    } catch (error) {
      console.error("Error fetching careers count:", error);
    }
  };

  const fetchCareer = async (careerId: string) => {
    try {
      setLoading(true);
      const [careerRes, skillsRes, coursesRes] = await Promise.all([
        supabase.from("careers").select("*").eq("id", careerId).single(),
        supabase.from("career_skills").select("*").eq("career_id", careerId).order("display_order"),
        supabase.from("career_courses").select("*, course:course_id(id, name, slug)").eq("career_id", careerId),
      ]);

      if (careerRes.error) throw careerRes.error;

      const career = careerRes.data;
      setCareerName(career.name);
      setCareerSlug(career.slug);
      setCareerDescription(career.description || "");
      setCareerIcon(career.icon);
      setCareerColor(career.color);
      setDisplayOrder(career.display_order);

      // Convert skills to nodes with positions
      const nodes: SkillNode[] = (skillsRes.data || []).map((skill, index) => {
        // Find courses mapped to this skill
        const mappedCourses: { courseId: string; contribution: number }[] = [];
        (coursesRes.data || []).forEach(cc => {
          const contributions = Array.isArray(cc.skill_contributions) 
            ? (cc.skill_contributions as unknown as SkillContribution[])
            : [];
          const contribution = contributions.find(c => c.skill_name === skill.skill_name);
          if (contribution) {
            mappedCourses.push({ courseId: cc.course_id, contribution: contribution.contribution });
          }
        });

        return {
          id: skill.id,
          name: skill.skill_name,
          weight: skill.weight || 25,
          icon: "Code2",
          color: skillColorOptions[index % skillColorOptions.length].name,
          x: 100 + (index % 3) * 280,
          y: 100 + Math.floor(index / 3) * 180,
          courses: mappedCourses,
        };
      });

      setSkillNodes(nodes);
    } catch (error: any) {
      toast({ title: "Error loading career", variant: "destructive" });
      navigate("/admin/courses?tab=careers");
    } finally {
      setLoading(false);
    }
  };

  // Slug generation
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  // Canvas interactions
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.skill-node')) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newSkill: SkillNode = {
      id: `skill-${Date.now()}`,
      name: "New Skill",
      weight: 25,
      icon: skillIconOptions[skillNodes.length % skillIconOptions.length],
      color: skillColorOptions[skillNodes.length % skillColorOptions.length].name,
      x: Math.max(20, Math.min(x - 100, rect.width - 220)),
      y: Math.max(20, Math.min(y - 40, rect.height - 100)),
      courses: [],
    };

    setSkillNodes(prev => [...prev, newSkill]);
    setEditingSkill(newSkill);
    setSkillEditorOpen(true);
  };

  const handleSkillMouseDown = (e: React.MouseEvent, skillId: string) => {
    e.stopPropagation();
    const skill = skillNodes.find(s => s.id === skillId);
    if (!skill) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDraggingSkill(skillId);
    setSelectedSkill(skillId);
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingSkill || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    setSkillNodes(prev => prev.map(s => 
      s.id === draggingSkill 
        ? { ...s, x: Math.max(0, Math.min(x, rect.width - 200)), y: Math.max(0, Math.min(y, rect.height - 80)) }
        : s
    ));
  }, [draggingSkill, dragOffset]);

  const handleCanvasMouseUp = () => {
    setDraggingSkill(null);
  };

  // Course drag handlers
  const handleCourseDragStart = (e: React.DragEvent, courseId: string) => {
    e.dataTransfer.setData("courseId", courseId);
    setDraggingCourse(courseId);
  };

  const handleCourseDragEnd = () => {
    setDraggingCourse(null);
    setDropTargetSkill(null);
  };

  const handleSkillDragOver = (e: React.DragEvent, skillId: string) => {
    e.preventDefault();
    setDropTargetSkill(skillId);
  };

  const handleSkillDragLeave = () => {
    setDropTargetSkill(null);
  };

  const handleSkillDrop = (e: React.DragEvent, skillId: string) => {
    e.preventDefault();
    const courseId = e.dataTransfer.getData("courseId");
    if (!courseId) return;

    // Check if course is already mapped to this skill
    const skill = skillNodes.find(s => s.id === skillId);
    if (skill?.courses.some(c => c.courseId === courseId)) {
      toast({ title: "Course already mapped to this skill" });
      setDropTargetSkill(null);
      setDraggingCourse(null);
      return;
    }

    // Open contribution dialog
    setPendingCourseMapping({ skillId, courseId });
    setContributionValue(50);
    setContributionDialogOpen(true);
    setDropTargetSkill(null);
    setDraggingCourse(null);
  };

  const confirmCourseMapping = () => {
    if (!pendingCourseMapping) return;

    setSkillNodes(prev => prev.map(skill => {
      if (skill.id === pendingCourseMapping.skillId) {
        return {
          ...skill,
          courses: [...skill.courses, { 
            courseId: pendingCourseMapping.courseId, 
            contribution: contributionValue 
          }],
        };
      }
      return skill;
    }));

    setContributionDialogOpen(false);
    setPendingCourseMapping(null);
    toast({ title: "Course mapped successfully!" });
  };

  const removeCourseFromSkill = (skillId: string, courseId: string) => {
    setSkillNodes(prev => prev.map(skill => {
      if (skill.id === skillId) {
        return {
          ...skill,
          courses: skill.courses.filter(c => c.courseId !== courseId),
        };
      }
      return skill;
    }));
  };

  const updateCourseContribution = (skillId: string, courseId: string, contribution: number) => {
    setSkillNodes(prev => prev.map(skill => {
      if (skill.id === skillId) {
        return {
          ...skill,
          courses: skill.courses.map(c => 
            c.courseId === courseId ? { ...c, contribution } : c
          ),
        };
      }
      return skill;
    }));
  };

  // Skill management
  const deleteSkill = (skillId: string) => {
    setSkillNodes(prev => prev.filter(s => s.id !== skillId));
    setSelectedSkill(null);
    setSkillEditorOpen(false);
  };

  const updateSkill = (updates: Partial<SkillNode>) => {
    if (!editingSkill) return;
    setSkillNodes(prev => prev.map(s => 
      s.id === editingSkill.id ? { ...s, ...updates } : s
    ));
    setEditingSkill(prev => prev ? { ...prev, ...updates } : null);
  };

  const autoBalanceWeights = () => {
    if (skillNodes.length === 0) return;
    const equalWeight = Math.floor(100 / skillNodes.length);
    const remainder = 100 - (equalWeight * skillNodes.length);
    setSkillNodes(prev => prev.map((skill, index) => ({
      ...skill,
      weight: equalWeight + (index < remainder ? 1 : 0),
    })));
  };

  // Calculations
  const getTotalWeight = () => skillNodes.reduce((sum, s) => sum + s.weight, 0);
  
  const getSkillColor = (colorName: string) => 
    skillColorOptions.find(c => c.name === colorName) || skillColorOptions[0];

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Icons.Code2 className="h-5 w-5" />;
  };

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const getMappedCourseIds = () => {
    const ids = new Set<string>();
    skillNodes.forEach(skill => {
      skill.courses.forEach(c => ids.add(c.courseId));
    });
    return ids;
  };

  // Save
  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      if (!careerName || !careerSlug) {
        toast({ title: "Name and slug are required", variant: "destructive" });
        return;
      }

      // Build course skill mappings
      const courseSkillMappings: Record<string, SkillContribution[]> = {};
      skillNodes.forEach(skill => {
        skill.courses.forEach(({ courseId, contribution }) => {
          if (!courseSkillMappings[courseId]) {
            courseSkillMappings[courseId] = [];
          }
          courseSkillMappings[courseId].push({
            skill_name: skill.name,
            contribution,
          });
        });
      });

      const courseIds = Object.keys(courseSkillMappings);

      if (id) {
        // Update career
        const { error } = await supabase
          .from("careers")
          .update({
            name: careerName,
            slug: careerSlug,
            description: careerDescription || null,
            icon: careerIcon,
            color: careerColor,
            display_order: displayOrder,
          })
          .eq("id", id);

        if (error) throw error;

        // Update skills
        await supabase.from("career_skills").delete().eq("career_id", id);
        if (skillNodes.length > 0) {
          const skillsToInsert = skillNodes.map((skill, idx) => ({
            career_id: id,
            skill_name: skill.name,
            display_order: idx + 1,
            weight: skill.weight,
          }));
          await supabase.from("career_skills").insert(skillsToInsert);
        }

        // Update courses
        await supabase.from("career_courses").delete().eq("career_id", id);
        if (courseIds.length > 0) {
          const coursesToInsert = courseIds.map(courseId => ({
            career_id: id,
            course_id: courseId,
            skill_contributions: courseSkillMappings[courseId] as unknown as Json,
          }));
          await supabase.from("career_courses").insert(coursesToInsert);
        }

        toast({ title: "Career updated successfully" });
      } else {
        // Create career
        const { data: newCareer, error } = await supabase
          .from("careers")
          .insert({
            name: careerName,
            slug: careerSlug,
            description: careerDescription || null,
            icon: careerIcon,
            color: careerColor,
            display_order: displayOrder,
          })
          .select()
          .single();

        if (error) throw error;

        // Insert skills
        if (skillNodes.length > 0) {
          const skillsToInsert = skillNodes.map((skill, idx) => ({
            career_id: newCareer.id,
            skill_name: skill.name,
            display_order: idx + 1,
            weight: skill.weight,
          }));
          await supabase.from("career_skills").insert(skillsToInsert);
        }

        // Insert courses
        if (courseIds.length > 0) {
          const coursesToInsert = courseIds.map(courseId => ({
            career_id: newCareer.id,
            course_id: courseId,
            skill_contributions: courseSkillMappings[courseId] as unknown as Json,
          }));
          await supabase.from("career_courses").insert(coursesToInsert);
        }

        toast({ title: "Career created successfully" });
      }

      navigate("/admin/courses?tab=careers");
    } catch (error: any) {
      toast({ title: "Error saving career", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse text-muted-foreground">Loading career...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin/courses?tab=careers")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${careerColor}`}>
                {getIcon(careerIcon)}
              </div>
              <div>
                <h1 className="text-xl font-bold">{careerName || "New Career"}</h1>
                <p className="text-sm text-muted-foreground">
                  {skillNodes.length} skills · {getMappedCourseIds().size} courses
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {skillNodes.length > 0 && (
              <Badge variant={getTotalWeight() === 100 ? "default" : "destructive"}>
                Weights: {getTotalWeight()}%
              </Badge>
            )}
            <Button variant="outline" onClick={() => navigate("/admin/courses?tab=careers")}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {id ? "Update" : "Create"}
            </Button>
          </div>
        </div>

        {/* Main Content with Right Sidebar */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left - Tabs Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-fit">
                <TabsTrigger value="canvas">
                  <Target className="h-4 w-4 mr-2" />
                  Skill Canvas
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Career Readiness Preview
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Career Settings
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="canvas" className="flex-1 mt-4">
                <div 
                  ref={canvasRef}
                  className="relative w-full h-full bg-muted/30 rounded-xl border-2 border-dashed border-border overflow-hidden cursor-crosshair"
                  onDoubleClick={handleCanvasDoubleClick}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                >
                  {/* Canvas hint */}
                  {skillNodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center text-muted-foreground">
                        <MousePointerClick className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">Double-click to create a skill</p>
                        <p className="text-sm">Drag courses from the right panel onto skills</p>
                      </div>
                    </div>
                  )}

                  {/* Skill Nodes */}
                  {skillNodes.map(skill => {
                    const colorStyle = getSkillColor(skill.color);
                    const isSelected = selectedSkill === skill.id;
                    const isDropTarget = dropTargetSkill === skill.id;
                    
                    return (
                      <div
                        key={skill.id}
                        className={`skill-node absolute select-none transition-shadow ${
                          isDropTarget ? 'ring-4 ' + colorStyle.ring : ''
                        } ${isSelected ? 'z-10' : 'z-0'}`}
                        style={{ left: skill.x, top: skill.y }}
                        onMouseDown={(e) => handleSkillMouseDown(e, skill.id)}
                        onDragOver={(e) => handleSkillDragOver(e, skill.id)}
                        onDragLeave={handleSkillDragLeave}
                        onDrop={(e) => handleSkillDrop(e, skill.id)}
                      >
                        <div className={`
                          w-52 rounded-xl border-2 backdrop-blur-sm cursor-move
                          ${colorStyle.bg} ${colorStyle.border}
                          ${isSelected ? 'shadow-lg' : 'shadow-md hover:shadow-lg'}
                          transition-all duration-200
                        `}>
                          {/* Skill Header */}
                          <div className="p-3 border-b border-inherit/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${colorStyle.bg} ${colorStyle.text}`}>
                                  {getIcon(skill.icon)}
                                </div>
                                <div>
                                  <p className={`font-semibold text-sm ${colorStyle.text}`}>
                                    {skill.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Weight: {skill.weight}%
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSkill(skill);
                                  setSkillEditorOpen(true);
                                }}
                              >
                                <Settings className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Mapped Courses */}
                          <div className="p-2 space-y-1 max-h-32 overflow-y-auto">
                            {skill.courses.length === 0 ? (
                              <div className={`text-xs text-center py-3 ${colorStyle.text} opacity-60`}>
                                Drop courses here
                              </div>
                            ) : (
                              skill.courses.map(({ courseId, contribution }) => {
                                const course = courses.find(c => c.id === courseId);
                                return (
                                  <div 
                                    key={courseId}
                                    className="flex items-center gap-1.5 p-1.5 rounded-lg bg-background/60 group"
                                  >
                                    <BookOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs truncate flex-1">
                                      {course?.name || "Unknown"}
                                    </span>
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                      {contribution}%
                                    </Badge>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeCourseFromSkill(skill.id, courseId);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

            <TabsContent value="preview" className="flex-1 mt-4 overflow-auto">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${careerColor}`}>
                      {getIcon(careerIcon)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{careerName || "Career Name"}</h2>
                      <p className="text-sm text-muted-foreground">
                        {skillNodes.length} skills · {getMappedCourseIds().size} courses mapped
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={autoBalanceWeights} disabled={skillNodes.length === 0}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Auto-balance Weights
                  </Button>
                </div>

                {skillNodes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No skills added yet</p>
                    <p className="text-sm">Add skills in the Skill Canvas tab to see readiness breakdown</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Overall Readiness */}
                    <Card className="p-4 border-primary/20 bg-primary/5">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Overall Career Readiness
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="relative w-24 h-24">
                          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                            <circle
                              className="text-muted stroke-current"
                              strokeWidth="10"
                              fill="transparent"
                              r="40"
                              cx="50"
                              cy="50"
                            />
                            <circle
                              className="text-primary stroke-current"
                              strokeWidth="10"
                              strokeLinecap="round"
                              fill="transparent"
                              r="40"
                              cx="50"
                              cy="50"
                              strokeDasharray={`${2 * Math.PI * 40}`}
                              strokeDashoffset={`${2 * Math.PI * 40 * (1 - (skillNodes.filter(s => s.courses.length > 0).length / skillNodes.length))}`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold">
                              {Math.round((skillNodes.filter(s => s.courses.length > 0).length / skillNodes.length) * 100)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm text-muted-foreground">
                            {skillNodes.filter(s => s.courses.length > 0).length} of {skillNodes.length} skills have courses
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total weight: {getTotalWeight()}%
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Weight Distribution */}
                    <Card className="p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Weight Distribution
                      </h3>
                      <div className="h-4 rounded-full overflow-hidden flex bg-muted">
                        {skillNodes.map((skill, idx) => {
                          const colorStyle = getSkillColor(skill.color);
                          return (
                            <div
                              key={skill.id}
                              className={`h-full ${colorStyle.bg.replace('/20', '')}`}
                              style={{ width: `${skill.weight}%` }}
                              title={`${skill.name}: ${skill.weight}%`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {skillNodes.map(skill => {
                          const colorStyle = getSkillColor(skill.color);
                          return (
                            <div key={skill.id} className="flex items-center gap-1.5 text-xs">
                              <div className={`w-2.5 h-2.5 rounded-full ${colorStyle.bg.replace('/20', '')}`} />
                              <span>{skill.name}</span>
                              <span className="text-muted-foreground">({skill.weight}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>

                    {/* Skill Details */}
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Skill Breakdown
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {skillNodes.map(skill => {
                          const colorStyle = getSkillColor(skill.color);
                          const hasCourses = skill.courses.length > 0;
                          const avgContribution = skill.courses.length > 0 
                            ? Math.round(skill.courses.reduce((sum, c) => sum + c.contribution, 0) / skill.courses.length)
                            : 0;
                          
                          return (
                            <Card key={skill.id} className={`p-4 ${colorStyle.bg} ${colorStyle.border} border`}>
                              <div className="flex items-center gap-2 mb-3">
                                <div className={`p-1.5 rounded-lg ${colorStyle.text}`}>
                                  {getIcon(skill.icon)}
                                </div>
                                <div className="flex-1">
                                  <p className={`font-semibold ${colorStyle.text}`}>{skill.name}</p>
                                  <p className="text-xs text-muted-foreground">Weight: {skill.weight}%</p>
                                </div>
                              </div>
                              
                              <Progress 
                                value={hasCourses ? avgContribution : 0} 
                                className="h-2 mb-2" 
                              />
                              
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <p>{skill.courses.length} course(s) mapped</p>
                                {hasCourses && <p>Avg. contribution: {avgContribution}%</p>}
                              </div>
                              
                              {skill.courses.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-inherit/50 space-y-1">
                                  {skill.courses.slice(0, 3).map(({ courseId, contribution }) => {
                                    const course = courses.find(c => c.id === courseId);
                                    return (
                                      <div key={courseId} className="flex items-center justify-between text-xs">
                                        <span className="truncate flex-1">{course?.name}</span>
                                        <Badge variant="secondary" className="text-[10px] ml-2">
                                          {contribution}%
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                  {skill.courses.length > 3 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{skill.courses.length - 3} more
                                    </p>
                                  )}
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="flex-1 mt-4 overflow-auto">
              <Card className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Career Name *</Label>
                    <Input
                      placeholder="e.g., Data Scientist"
                      value={careerName}
                      onChange={(e) => {
                        setCareerName(e.target.value);
                        if (!id) setCareerSlug(generateSlug(e.target.value));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug *</Label>
                    <Input
                      placeholder="e.g., data-scientist"
                      value={careerSlug}
                      onChange={(e) => setCareerSlug(generateSlug(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of this career path..."
                    value={careerDescription}
                    onChange={(e) => setCareerDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select value={careerIcon} onValueChange={setCareerIcon}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {careerIconOptions.map(icon => (
                          <SelectItem key={icon} value={icon}>
                            <div className="flex items-center gap-2">
                              {getIcon(icon)}
                              {icon}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Color Theme</Label>
                    <Select value={careerColor} onValueChange={setCareerColor}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {careerColorOptions.map(color => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded ${color.value}`} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Display Order</Label>
                    <Input
                      type="number"
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

          {/* Right Sidebar - Course Library */}
          <Card className="w-72 flex-shrink-0 flex flex-col min-h-0">
            <div className="p-4 border-b flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Course Library</h3>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredCourses.map(course => {
                  const isMapped = getMappedCourseIds().has(course.id);
                  return (
                    <div
                      key={course.id}
                      draggable
                      onDragStart={(e) => handleCourseDragStart(e, course.id)}
                      onDragEnd={handleCourseDragEnd}
                      className={`
                        flex items-center gap-2 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing
                        transition-all duration-150
                        ${isMapped 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'bg-card hover:bg-muted/50 border-border'
                        }
                        ${draggingCourse === course.id ? 'opacity-50 scale-95' : ''}
                      `}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{course.name}</p>
                      </div>
                      {isMapped && (
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                          Mapped
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Skill Editor Dialog */}
      <Dialog open={skillEditorOpen} onOpenChange={setSkillEditorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Skill</DialogTitle>
            <DialogDescription>
              Configure skill name, weight, and appearance
            </DialogDescription>
          </DialogHeader>
          
          {editingSkill && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Skill Name</Label>
                <Input
                  value={editingSkill.name}
                  onChange={(e) => updateSkill({ name: e.target.value })}
                  placeholder="e.g., Python Programming"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Weight ({editingSkill.weight}%)</Label>
                <Slider
                  value={[editingSkill.weight]}
                  onValueChange={([v]) => updateSkill({ weight: v })}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  How much this skill contributes to overall career readiness
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={editingSkill.icon} onValueChange={(v) => updateSkill({ icon: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {skillIconOptions.map(icon => (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            {getIcon(icon)}
                            {icon}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={editingSkill.color} onValueChange={(v) => updateSkill({ color: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {skillColorOptions.map(color => (
                        <SelectItem key={color.name} value={color.name}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${color.bg} ${color.border} border`} />
                            {color.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mapped courses in skill */}
              {editingSkill.courses.length > 0 && (
                <div className="space-y-2">
                  <Label>Mapped Courses</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {editingSkill.courses.map(({ courseId, contribution }) => {
                      const course = courses.find(c => c.id === courseId);
                      return (
                        <div key={courseId} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm flex-1 truncate">{course?.name}</span>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={contribution}
                            onChange={(e) => updateCourseContribution(
                              editingSkill.id, 
                              courseId, 
                              Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                            )}
                            className="w-16 h-7 text-xs text-center"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeCourseFromSkill(editingSkill.id, courseId)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => editingSkill && deleteSkill(editingSkill.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Skill
            </Button>
            <Button onClick={() => setSkillEditorOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Contribution Dialog */}
      <Dialog open={contributionDialogOpen} onOpenChange={setContributionDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Contribution Level</DialogTitle>
            <DialogDescription>
              How much does this course contribute to the skill?
            </DialogDescription>
          </DialogHeader>
          
          {pendingCourseMapping && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">
                  {courses.find(c => c.id === pendingCourseMapping.courseId)?.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  → {skillNodes.find(s => s.id === pendingCourseMapping.skillId)?.name}
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Contribution</Label>
                  <span className="text-lg font-bold text-primary">{contributionValue}%</span>
                </div>
                <Slider
                  value={[contributionValue]}
                  onValueChange={([v]) => setContributionValue(v)}
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low impact</span>
                  <span>Full mastery</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmCourseMapping}>
              <Zap className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCareerEditor;
