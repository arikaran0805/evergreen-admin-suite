import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Link, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Prerequisite {
  id?: string;
  prerequisite_course_id: string | null;
  prerequisite_text: string | null;
  display_order: number;
  linkedCourse?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface CoursePrerequisiteEditorProps {
  courseId?: string;
  prerequisites: Prerequisite[];
  onChange: (prerequisites: Prerequisite[]) => void;
}

export function CoursePrerequisiteEditor({
  courseId,
  prerequisites,
  onChange,
}: CoursePrerequisiteEditorProps) {
  const [availableCourses, setAvailableCourses] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableCourses();
  }, [courseId]);

  const fetchAvailableCourses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, slug")
        .in("status", ["published", "approved"])
        .order("name");

      if (error) throw error;
      
      // Filter out the current course
      const filtered = (data || []).filter(c => c.id !== courseId);
      setAvailableCourses(filtered);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const addTextPrerequisite = () => {
    const newPrereq: Prerequisite = {
      prerequisite_course_id: null,
      prerequisite_text: "",
      display_order: prerequisites.length,
    };
    onChange([...prerequisites, newPrereq]);
  };

  const addCoursePrerequisite = () => {
    const newPrereq: Prerequisite = {
      prerequisite_course_id: "",
      prerequisite_text: null,
      display_order: prerequisites.length,
    };
    onChange([...prerequisites, newPrereq]);
  };

  const updatePrerequisite = (index: number, updates: Partial<Prerequisite>) => {
    const updated = [...prerequisites];
    updated[index] = { ...updated[index], ...updates };
    
    // If switching to course link, clear text
    if (updates.prerequisite_course_id !== undefined && updates.prerequisite_course_id !== null) {
      updated[index].prerequisite_text = null;
      // Find and attach the linked course info
      const course = availableCourses.find(c => c.id === updates.prerequisite_course_id);
      if (course) {
        updated[index].linkedCourse = course;
      }
    }
    
    onChange(updated);
  };

  const removePrerequisite = (index: number) => {
    const updated = prerequisites.filter((_, i) => i !== index);
    // Update display order
    updated.forEach((p, i) => {
      p.display_order = i;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center justify-between">
        <span>Prerequisites</span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={addCoursePrerequisite}
            disabled={availableCourses.length === 0}
          >
            <Link className="h-3 w-3 mr-1" />
            Course
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={addTextPrerequisite}
          >
            <FileText className="h-3 w-3 mr-1" />
            Text
          </Button>
        </div>
      </Label>
      
      {prerequisites.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No prerequisites defined. Add a linked course or text requirement.
        </p>
      ) : (
        <div className="space-y-2">
          {prerequisites.map((prereq, index) => (
            <div key={index} className="flex items-center gap-2">
              {prereq.prerequisite_text !== null ? (
                // Text-based prerequisite
                <div className="flex-1 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    value={prereq.prerequisite_text || ""}
                    onChange={(e) => updatePrerequisite(index, { prerequisite_text: e.target.value })}
                    placeholder="e.g. Basic programming knowledge"
                    className="text-sm"
                  />
                </div>
              ) : (
                // Course-linked prerequisite
                <div className="flex-1 flex items-center gap-2">
                  <Link className="h-4 w-4 text-primary flex-shrink-0" />
                  <Select
                    value={prereq.prerequisite_course_id || ""}
                    onValueChange={(value) => updatePrerequisite(index, { prerequisite_course_id: value })}
                  >
                    <SelectTrigger className={cn(
                      "text-sm",
                      !prereq.prerequisite_course_id && "text-muted-foreground"
                    )}>
                      <SelectValue placeholder="Select a course...">
                        {prereq.linkedCourse?.name || 
                         availableCourses.find(c => c.id === prereq.prerequisite_course_id)?.name ||
                         "Select a course..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removePrerequisite(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Link to other courses or add text requirements learners should meet
      </p>
    </div>
  );
}

export default CoursePrerequisiteEditor;
