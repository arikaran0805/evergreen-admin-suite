import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Pencil, Trash2, Plus, X, BookOpen, Settings2 } from "lucide-react";
import * as Icons from "lucide-react";

interface Career {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  display_order: number;
}

interface CareerSkill {
  id: string;
  career_id: string;
  skill_name: string;
  display_order: number;
}

interface SkillContribution {
  skill_name: string;
  contribution: number;
}

interface CareerCourse {
  id: string;
  career_id: string;
  course_id: string;
  skill_contributions: SkillContribution[];
  course?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Course {
  id: string;
  name: string;
  slug: string;
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

const AdminCareersTab = () => {
  const { toast } = useToast();
  const [careers, setCareers] = useState<Career[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [careerSkills, setCareerSkills] = useState<Record<string, CareerSkill[]>>({});
  const [careerCourses, setCareerCourses] = useState<Record<string, CareerCourse[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCareer, setEditingCareer] = useState<Career | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "Briefcase",
    color: colorOptions[0].value,
    display_order: 0,
    skills: [] as string[],
    courseIds: [] as string[],
    courseSkillMappings: {} as Record<string, SkillContribution[]>, // courseId -> skill contributions
  });
  const [newSkill, setNewSkill] = useState("");
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedCourseForMapping, setSelectedCourseForMapping] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [careersRes, coursesRes, skillsRes, careerCoursesRes] = await Promise.all([
        supabase.from("careers").select("*").order("display_order"),
        supabase.from("courses").select("id, name, slug").order("name"),
        supabase.from("career_skills").select("*").order("display_order"),
        supabase.from("career_courses").select("*, course:course_id(id, name, slug)"),
      ]);

      if (careersRes.error) throw careersRes.error;
      if (coursesRes.error) throw coursesRes.error;
      
      setCareers(careersRes.data || []);
      setCourses(coursesRes.data || []);

      // Group skills by career
      const skillsByCareer: Record<string, CareerSkill[]> = {};
      (skillsRes.data || []).forEach(skill => {
        if (!skillsByCareer[skill.career_id]) {
          skillsByCareer[skill.career_id] = [];
        }
        skillsByCareer[skill.career_id].push(skill);
      });
      setCareerSkills(skillsByCareer);

      // Group courses by career with skill contributions
      const coursesByCareer: Record<string, CareerCourse[]> = {};
      (careerCoursesRes.data || []).forEach(cc => {
        if (!coursesByCareer[cc.career_id]) {
          coursesByCareer[cc.career_id] = [];
        }
        const skillContributions = Array.isArray(cc.skill_contributions) 
          ? (cc.skill_contributions as unknown as SkillContribution[])
          : [];
        coursesByCareer[cc.career_id].push({
          id: cc.id,
          career_id: cc.career_id,
          course_id: cc.course_id,
          skill_contributions: skillContributions,
          course: cc.course,
        });
      });
      setCareerCourses(coursesByCareer);
    } catch (error: any) {
      toast({ title: "Error fetching data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.slug) {
        toast({ title: "Name and slug are required", variant: "destructive" });
        return;
      }

      if (editingCareer) {
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
          .eq("id", editingCareer.id);

        if (error) throw error;

        // Update skills: delete old, insert new
        await supabase.from("career_skills").delete().eq("career_id", editingCareer.id);
        if (formData.skills.length > 0) {
          const skillsToInsert = formData.skills.map((skill, idx) => ({
            career_id: editingCareer.id,
            skill_name: skill,
            display_order: idx + 1,
          }));
          await supabase.from("career_skills").insert(skillsToInsert);
        }

        // Update courses with skill mappings: delete old, insert new
        await supabase.from("career_courses").delete().eq("career_id", editingCareer.id);
        if (formData.courseIds.length > 0) {
          const coursesToInsert = formData.courseIds.map(courseId => ({
            career_id: editingCareer.id,
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
            skill_name: skill,
            display_order: idx + 1,
          }));
          await supabase.from("career_skills").insert(skillsToInsert);
        }

        // Insert courses with skill mappings
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

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error saving career", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this career?")) return;

    try {
      const { error } = await supabase.from("careers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Career deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error deleting career", description: error.message, variant: "destructive" });
    }
  };

  const openEditDialog = (career: Career) => {
    setEditingCareer(career);
    const skills = careerSkills[career.id]?.map(s => s.skill_name) || [];
    const courseIds = careerCourses[career.id]?.map(cc => cc.course_id) || [];
    
    // Build skill mappings from existing data
    const courseSkillMappings: Record<string, SkillContribution[]> = {};
    careerCourses[career.id]?.forEach(cc => {
      courseSkillMappings[cc.course_id] = cc.skill_contributions || [];
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
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCareer(null);
    resetForm();
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      icon: "Briefcase",
      color: colorOptions[0].value,
      display_order: careers.length + 1,
      skills: [],
      courseIds: [],
      courseSkillMappings: {},
    });
    setNewSkill("");
    setSelectedCourseForMapping(null);
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Career
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {careers.map((career) => (
          <Card key={career.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${career.color}`}>
                    {getIcon(career.icon)}
                  </div>
                  <div>
                    <span className="block">{career.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">/{career.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(career)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(career.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {career.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{career.description}</p>
              )}
              
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {careerSkills[career.id]?.slice(0, 5).map((skill) => (
                    <Badge key={skill.id} variant="secondary" className="text-xs">
                      {skill.skill_name}
                    </Badge>
                  ))}
                  {(careerSkills[career.id]?.length || 0) > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{(careerSkills[career.id]?.length || 0) - 5} more
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Courses & Skill Contributions:</p>
                <div className="space-y-2">
                  {careerCourses[career.id]?.slice(0, 3).map((cc) => {
                    const totalContribution = cc.skill_contributions?.reduce((sum, s) => sum + s.contribution, 0) || 0;
                    const avgContribution = cc.skill_contributions?.length ? Math.round(totalContribution / cc.skill_contributions.length) : 0;
                    return (
                      <div key={cc.id} className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          <BookOpen className="h-3 w-3 mr-1" />
                          {cc.course?.name}
                        </Badge>
                        {cc.skill_contributions?.length > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {cc.skill_contributions.length} skills · avg {avgContribution}%
                          </span>
                        ) : (
                          <span className="text-xs text-amber-500">No skills mapped</span>
                        )}
                      </div>
                    );
                  })}
                  {(careerCourses[career.id]?.length || 0) > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{(careerCourses[career.id]?.length || 0) - 3} more courses
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCareer ? "Edit Career" : "Create Career"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Data Science"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

            <div className="space-y-2">
              <Label>Skills (for radar chart)</Label>
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
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.skills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {skill}
                    <button onClick={() => removeSkill(skill)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Associated Courses & Skill Mappings</Label>
              <p className="text-xs text-muted-foreground">Select courses and set how much each contributes to career skills (0-100%)</p>
              <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-2">
                {courses.map((course) => {
                  const isSelected = formData.courseIds.includes(course.id);
                  const mappedCount = getCourseMappedSkillsCount(course.id);
                  const mappings = formData.courseSkillMappings[course.id] || [];
                  const totalContribution = mappings.reduce((sum, m) => sum + m.contribution, 0);
                  const avgContribution = mappings.length ? Math.round(totalContribution / mappings.length) : 0;
                  
                  return (
                    <div
                      key={course.id}
                      className={`p-3 rounded-lg border ${
                        isSelected ? "bg-primary/5 border-primary/30" : "hover:bg-muted border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCourse(course.id)}
                            className="rounded"
                          />
                          <span className="text-sm font-medium">{course.name}</span>
                        </label>
                        {isSelected && formData.skills.length > 0 && (
                          <Button
                            type="button"
                            variant={mappedCount > 0 ? "default" : "outline"}
                            size="sm"
                            onClick={() => openSkillMappingDialog(course.id)}
                            className="ml-2 gap-1"
                          >
                            <Settings2 className="h-3 w-3" />
                            {mappedCount > 0 ? `${mappedCount} skills` : "Map Skills"}
                          </Button>
                        )}
                      </div>
                      {isSelected && mappedCount > 0 && (
                        <div className="mt-2 pl-6 space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {mappings.filter(m => m.contribution > 0).map((m) => (
                              <Badge key={m.skill_name} variant="secondary" className="text-xs">
                                {m.skill_name}: {m.contribution}%
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Total contribution: {totalContribution}% · Avg per skill: {avgContribution}%
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {formData.skills.length === 0 && formData.courseIds.length > 0 && (
                <p className="text-xs text-amber-500">Add skills first to enable skill mapping</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingCareer ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skill Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Map Skills for: {courses.find(c => c.id === selectedCourseForMapping)?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Set how much completing this course contributes to each skill (0-100%)
            </p>
            {formData.skills.map((skill) => {
              const value = selectedCourseForMapping ? getSkillContributionValue(selectedCourseForMapping, skill) : 0;
              return (
                <div key={skill} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{skill}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={value}
                        onChange={(e) => updateSkillContribution(skill, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-16 h-8 text-center"
                      />
                      <span className="text-sm text-muted-foreground w-4">%</span>
                    </div>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([v]) => updateSkillContribution(skill, v)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              );
            })}
            {formData.skills.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No skills defined for this career path
              </p>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setMappingDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCareersTab;
