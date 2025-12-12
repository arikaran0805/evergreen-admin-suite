import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCareers } from "@/hooks/useCareers";
import { CheckCircle } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

interface CareerSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCareerSlug: string;
  onCareerSelect: (careerSlug: string) => void;
}

export const CareerSelectionDialog = ({
  open,
  onOpenChange,
  selectedCareerSlug,
  onCareerSelect,
}: CareerSelectionDialogProps) => {
  const { careers, getCareerCourseSlugs, loading } = useCareers();
  const [tempSelection, setTempSelection] = useState<string>(selectedCareerSlug);

  const handleConfirm = () => {
    onCareerSelect(tempSelection);
    onOpenChange(false);
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Icons.Briefcase className="h-5 w-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Choose Your Career Path</DialogTitle>
          <DialogDescription>
            Select a career path to personalize your learning experience and track your progress.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4 overflow-y-auto flex-1 pr-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            careers.map((career) => {
              const isSelected = tempSelection === career.slug;
              const courseSlugs = getCareerCourseSlugs(career.id);
              
              return (
                <button
                  key={career.id}
                  onClick={() => setTempSelection(career.slug)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className={cn("p-3 rounded-lg", career.color)}>
                    {getIcon(career.icon)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{career.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {courseSlugs.length} courses available
                    </p>
                    {career.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {career.description}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
