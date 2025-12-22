import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Save, Plus, X, BookOpen, Settings2 } from "lucide-react";
import * as Icons from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface SkillFormData {
  name: string;
  weight: number;
}

interface SkillContribution {
  skill_name: string;
  contribution: number;
}

interface Course {
  id: string;
  name: string;
  slug: string;
}

interface CareerSkill {
  id: string;
  career_id: string;
  skill_name: string;
  display_order: number;
  weight: number;
}

interface CareerCourse {
  id: string;
  career_id: string;
  course_id: string;
  skill_contributions: SkillContribution[];
}

const iconOptions = [
  "Brain", "Database", "Layers", "BarChart3", "Code2", "Briefcase", "Server", "Cloud",
  "Cpu", "Terminal", "Rocket", "Target", "Zap", "Award", "Star", "TrendingUp"
];

const colorOptions = [
  { label: "Purple", value: "bg-purple-500/10 text-purple-500 border-purple-500/30" },
  { label: "Blue", value: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  { label: "Orange", value: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
  { label: "Green", value: "bg-green-500/10 text-green-500 border-green-500/30" },
  { label: "Pink", value: "bg-pink-500/10 text-pink-500 border-pink-500/30" },
  { label: "Teal", value: "bg-teal-500/10 text-teal-500 border-teal-500/30" },
  { label: "Red", value: "bg-red-500/10 text-red-500 border-red-500/30" },
  { label: "Sky", value: "bg-sky-500/10 text-sky-500 border-sky-500/30" },
];

const AdminCareerEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [careersCount, setCareersCount] = useState(0);
  const [newSkill, setNewSkill] = useState("");
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedCourseForMapping, setSelectedCourseForMapping] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "Briefcase",
    color: colorOptions[0].value,
    display_order: 0,
    skills: [] as SkillFormData[],
    courseIds: [] as string[],
    courseSkillMappings: {} as Record<string, SkillContribution[]>,
  });

  useEffect(() => {
    checkAdminAccess();
    fetchCourses();
    fetchCareersCount();
    if (id) {
      fetchCareer(id);
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
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/");
      }
    } catch (error: any) {
      console.error("Error checking access:", error);
      navigate("/");
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, slug")
        .order("name");

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchCareersCount = async () => {
    try {
      const { count, error } = await supabase
        .from("careers")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      setCareersCount(count || 0);
      if (!id) {
        setFormData(prev => ({ ...prev, display_order: (count || 0) + 1 }));
      }
    } catch (error: any) {
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
      const skills = (skillsRes.data || []).map(s => ({ 
        name: s.skill_name, 
        weight: s.weight || 25 
      }));
      const courseIds = (coursesRes.data || []).map(cc => cc.course_id);
      
      const courseSkillMappings: Record<string, SkillContribution[]> = {};
      (coursesRes.data || []).forEach(cc => {
        const skillContributions = Array.isArray(cc.skill_contributions) 
          ? (cc.skill_contributions as unknown as SkillContribution[])
          : [];
        courseSkillMappings[cc.course_id] = skillContributions;
      });

      setFormData({
        name: career.name,
        slug: career.slug,
        description: career.description || "",
        icon: career.icon,
        color: career.color,
        display_order: career.display_order,
        skills,
        courseIds,
        courseSkillMappings,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load career",
        variant: "destructive",
      });
      navigate("/admin/courses?tab=careers");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      if (!formData.name || !formData.slug) {
        toast({ title: "Name and slug are required", variant: "destructive" });
        return;
      }

      if (id) {
        // Update career
        const { error } = await supabase
          .from("careers")
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            icon: formData.icon,
            color: formData.color,
            display_order: formData.display_order,
          })
          .eq("id", id);

        if (error) throw error;

        // Update skills
        await supabase.from("career_skills").delete().eq("career_id", id);
        if (formData.skills.length > 0) {
          const skillsToInsert = formData.skills.map((skill, idx) => ({
            career_id: id,
            skill_name: skill.name,
            display_order: idx + 1,
            weight: skill.weight,
          }));
          await supabase.from("career_skills").insert(skillsToInsert);
        }

        // Update courses
        await supabase.from("career_courses").delete().eq("career_id", id);
        if (formData.courseIds.length > 0) {
          const coursesToInsert = formData.courseIds.map(courseId => ({
            career_id: id,
            course_id: courseId,
            skill_contributions: (formData.courseSkillMappings[courseId] || []) as unknown as Json,
          }));
          await supabase.from("career_courses").insert(coursesToInsert);
        }

        toast({ title: "Career updated successfully" });
      } else {
        // Create career
        const { data: newCareer, error } = await supabase
          .from("careers")
          .insert({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            icon: formData.icon,
            color: formData.color,
            display_order: formData.display_order,
          })
          .select()
          .single();

        if (error) throw error;

        // Insert skills
        if (formData.skills.length > 0) {
          const skillsToInsert = formData.skills.map((skill, idx) => ({
            career_id: newCareer.id,
            skill_name: skill.name,
            display_order: idx + 1,
            weight: skill.weight,
          }));
          await supabase.from("career_skills").insert(skillsToInsert);
        }

        // Insert courses
        if (formData.courseIds.length > 0) {
          const coursesToInsert = formData.courseIds.map(courseId => ({
            career_id: newCareer.id,
            course_id: courseId,
            skill_contributions: (formData.courseSkillMappings[courseId] || []) as unknown as Json,
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

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.some(s => s.name === newSkill.trim())) {
      const defaultWeight = formData.skills.length === 0 ? 100 : Math.floor(100 / (formData.skills.length + 1));
      setFormData({ ...formData, skills: [...formData.skills, { name: newSkill.trim(), weight: defaultWeight }] });
      setNewSkill("");
    }
  };

  const removeSkill = (skillName: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s.name !== skillName) });
  };

  const updateSkillWeight = (skillName: string, weight: number) => {
    setFormData({
      ...formData,
      skills: formData.skills.map(s => s.name === skillName ? { ...s, weight } : s),
    });
  };

  const getTotalWeight = () => {
    return formData.skills.reduce((sum, s) => sum + s.weight, 0);
  };

  const autoBalanceWeights = () => {
    if (formData.skills.length === 0) return;
    const equalWeight = Math.floor(100 / formData.skills.length);
    const remainder = 100 - (equalWeight * formData.skills.length);
    const balancedSkills = formData.skills.map((skill, index) => ({
      ...skill,
      weight: equalWeight + (index < remainder ? 1 : 0),
    }));
    setFormData({ ...formData, skills: balancedSkills });
  };

  const toggleCourse = (courseId: string) => {
    if (formData.courseIds.includes(courseId)) {
      const newMappings = { ...formData.courseSkillMappings };
      delete newMappings[courseId];
      setFormData({ 
        ...formData, 
        courseIds: formData.courseIds.filter(id => id !== courseId),
        courseSkillMappings: newMappings,
      });
    } else {
      setFormData({ ...formData, courseIds: [...formData.courseIds, courseId] });
    }
  };

  const openSkillMappingDialog = (courseId: string) => {
    setSelectedCourseForMapping(courseId);
    setMappingDialogOpen(true);
  };

  const updateSkillContribution = (skillName: string, contribution: number) => {
    if (!selectedCourseForMapping) return;
    
    const currentMappings = formData.courseSkillMappings[selectedCourseForMapping] || [];
    const existingIndex = currentMappings.findIndex(m => m.skill_name === skillName);
    
    let newMappings: SkillContribution[];
    if (contribution === 0) {
      newMappings = currentMappings.filter(m => m.skill_name !== skillName);
    } else if (existingIndex >= 0) {
      newMappings = [...currentMappings];
      newMappings[existingIndex] = { skill_name: skillName, contribution };
    } else {
      newMappings = [...currentMappings, { skill_name: skillName, contribution }];
    }
    
    setFormData({
      ...formData,
      courseSkillMappings: {
        ...formData.courseSkillMappings,
        [selectedCourseForMapping]: newMappings,
      },
    });
  };

  const getSkillContributionValue = (courseId: string, skillName: string): number => {
    const mappings = formData.courseSkillMappings[courseId] || [];
    return mappings.find(m => m.skill_name === skillName)?.contribution || 0;
  };

  const getCourseMappedSkillsCount = (courseId: string): number => {
    return (formData.courseSkillMappings[courseId] || []).filter(m => m.contribution > 0).length;
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Icons.Briefcase className="h-5 w-5" />;
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  if (loading && id) {
    return (
      <AdminLayout>
        <div className="text-center">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex gap-6 h-full">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/courses?tab=careers")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Careers
            </Button>
            <h1 className="text-3xl font-bold">
              {id ? "Edit Career" : "Create New Career"}
            </h1>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Basic Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Data Science"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (!id) {
                        setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    placeholder="e.g., data-science"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the career path"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map(icon => (
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
                  <Select value={formData.color} onValueChange={(v) => setFormData({ ...formData, color: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map(color => (
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
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </Card>

            {/* Skills Section */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Skills & Weights</h2>
                  <p className="text-sm text-muted-foreground">
                    Define skills for this career path. Weights determine contribution to overall readiness.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {formData.skills.length > 0 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={autoBalanceWeights}
                    >
                      Auto-balance
                    </Button>
                  )}
                  <Badge variant={getTotalWeight() === 100 ? "default" : "destructive"}>
                    Total: {getTotalWeight()}%
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill (e.g., Python, SQL)"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                />
                <Button type="button" variant="outline" onClick={addSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.skills.length > 0 && (
                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                  {formData.skills.map((skill) => (
                    <div key={skill.name} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-32 truncate">{skill.name}</span>
                      <Slider
                        value={[skill.weight]}
                        onValueChange={([v]) => updateSkillWeight(skill.name, v)}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={skill.weight}
                        onChange={(e) => updateSkillWeight(skill.name, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-16 h-8 text-center"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeSkill(skill.name)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {getTotalWeight() !== 100 && (
                    <p className="text-sm text-destructive">
                      Weights should total 100% for accurate readiness calculation.
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* Courses Section */}
            <Card className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Linked Courses</h2>
                <p className="text-sm text-muted-foreground">
                  Select courses and map how much each contributes to the skills above.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                {courses.map(course => {
                  const isSelected = formData.courseIds.includes(course.id);
                  const mappedCount = getCourseMappedSkillsCount(course.id);
                  return (
                    <div 
                      key={course.id} 
                      className={`flex items-center justify-between gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleCourse(course.id)}
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span className="text-sm truncate">{course.name}</span>
                      </div>
                      {isSelected && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSkillMappingDialog(course.id);
                          }}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      )}
                      {isSelected && mappedCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {mappedCount} skills
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {formData.courseIds.length > 0 && formData.skills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Courses & Skill Contributions:</p>
                  <div className="space-y-2">
                    {formData.courseIds.map(courseId => {
                      const course = courses.find(c => c.id === courseId);
                      const mappings = formData.courseSkillMappings[courseId] || [];
                      return (
                        <div key={courseId} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium">{course?.name}</span>
                          <div className="flex items-center gap-2">
                            {mappings.length > 0 ? (
                              <div className="flex gap-1">
                                {mappings.slice(0, 3).map(m => (
                                  <Badge key={m.skill_name} variant="outline" className="text-xs">
                                    {m.skill_name}: {m.contribution}%
                                  </Badge>
                                ))}
                                {mappings.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{mappings.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-amber-500">No skills mapped</span>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openSkillMappingDialog(courseId)}
                            >
                              <Settings2 className="h-4 w-4 mr-1" />
                              Map Skills
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 space-y-4">
          <Card className="p-4 space-y-4 sticky top-6">
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {id ? "Update Career" : "Create Career"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/admin/courses?tab=careers")}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${formData.color}`}>
                  {getIcon(formData.icon)}
                </div>
                <div>
                  <p className="font-medium">{formData.name || "Career Name"}</p>
                  <p className="text-xs text-muted-foreground">/{formData.slug || "slug"}</p>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>{formData.skills.length} skill(s)</p>
                <p>{formData.courseIds.length} course(s)</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Skill Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Map Skills for: {courses.find(c => c.id === selectedCourseForMapping)?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set how much this course contributes to each skill (0-100%). 
              This determines skill progress when completing lessons.
            </p>
            
            {formData.skills.length === 0 ? (
              <p className="text-sm text-amber-500">Add skills above first to map them.</p>
            ) : (
              <div className="space-y-4">
                {formData.skills.map(skill => {
                  const value = selectedCourseForMapping ? getSkillContributionValue(selectedCourseForMapping, skill.name) : 0;
                  return (
                    <div key={skill.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          {skill.name}
                          <Badge variant="outline" className="text-xs">Weight: {skill.weight}%</Badge>
                        </Label>
                        <span className="text-sm font-medium">{value}%</span>
                      </div>
                      <Slider
                        value={[value]}
                        onValueChange={([v]) => updateSkillContribution(skill.name, v)}
                        max={100}
                        step={5}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setMappingDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCareerEditor;
