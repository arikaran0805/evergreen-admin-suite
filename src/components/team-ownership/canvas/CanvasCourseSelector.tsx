import { GraduationCap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Course } from "../types";

interface CanvasCourseSelectorProps {
  courses: Course[];
  selectedCourseIds: string[];
  onSelect: (course: Course) => void;
  onClose: () => void;
}

const CanvasCourseSelector = ({
  courses,
  selectedCourseIds,
  onSelect,
  onClose,
}: CanvasCourseSelectorProps) => {
  const availableCourses = courses.filter((c) => !selectedCourseIds.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Add Course</h2>
              <p className="text-xs text-muted-foreground">Select a course to add to this team</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Course List */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-2">
            {availableCourses.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">
                  {courses.length === 0 ? "No courses in this career" : "All courses have been added"}
                </p>
              </div>
            ) : (
              availableCourses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => onSelect(course)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border bg-background hover:border-accent/50 hover:bg-accent/5 transition-all group text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                      {course.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">/{course.slug}</p>
                  </div>
                  <div className="text-muted-foreground group-hover:text-accent transition-colors">
                    +
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default CanvasCourseSelector;
