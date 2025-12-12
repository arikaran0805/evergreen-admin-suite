import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, X, BookOpen } from "lucide-react";
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

interface CareerCourse {
  id: string;
  career_id: string;
  course_id: string;
  skill_contributions: any;
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
  });
  const [newSkill, setNewSkill] = useState("");

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

      // Group courses by career
      const coursesByCareer: Record<string, CareerCourse[]> = {};
      (careerCoursesRes.data || []).forEach(cc => {
        if (!coursesByCareer[cc.career_id]) {
          coursesByCareer[cc.career_id] = [];
        }
        coursesByCareer[cc.career_id].push(cc);
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

        // Update courses: delete old, insert new
        await supabase.from("career_courses").delete().eq("career_id", editingCareer.id);
        if (formData.courseIds.length > 0) {
          const coursesToInsert = formData.courseIds.map(courseId => ({
            career_id: editingCareer.id,
            course_id: courseId,
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

        // Insert courses
        if (formData.courseIds.length > 0) {
          const coursesToInsert = formData.courseIds.map(courseId => ({
            career_id: newCareer.id,
            course_id: courseId,
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
    setFormData({
      name: career.name,
      slug: career.slug,
      description: career.description || "",
      icon: career.icon,
      color: career.color,
      display_order: career.display_order,
      skills,
      courseIds,
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
    });
    setNewSkill("");
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
      setFormData({ ...formData, courseIds: formData.courseIds.filter(id => id !== courseId) });
    } else {
      setFormData({ ...formData, courseIds: [...formData.courseIds, courseId] });
    }
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
                <p className="text-xs font-medium text-muted-foreground mb-1">Courses:</p>
                <div className="flex flex-wrap gap-1">
                  {careerCourses[career.id]?.slice(0, 3).map((cc) => (
                    <Badge key={cc.id} variant="outline" className="text-xs">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {cc.course?.name}
                    </Badge>
                  ))}
                  {(careerCourses[career.id]?.length || 0) > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{(careerCourses[career.id]?.length || 0) - 3} more
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
              <Label>Associated Courses</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {courses.map((course) => (
                  <label
                    key={course.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${
                      formData.courseIds.includes(course.id) ? "bg-primary/10" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.courseIds.includes(course.id)}
                      onChange={() => toggleCourse(course.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{course.name}</span>
                  </label>
                ))}
              </div>
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
    </div>
  );
};

export default AdminCareersTab;
