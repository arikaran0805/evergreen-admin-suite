import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { careerPaths, CareerPath } from "@/components/CareerPathSelector";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CareerSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCareer: CareerPath;
  onCareerSelect: (career: CareerPath) => void;
}

export const CareerSelectionDialog = ({
  open,
  onOpenChange,
  selectedCareer,
  onCareerSelect,
}: CareerSelectionDialogProps) => {
  const [tempSelection, setTempSelection] = useState<CareerPath>(selectedCareer);

  const handleConfirm = () => {
    onCareerSelect(tempSelection);
    onOpenChange(false);
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
          {careerPaths.map((career) => {
            const Icon = career.icon;
            const isSelected = tempSelection === career.id;
            
            return (
              <button
                key={career.id}
                onClick={() => setTempSelection(career.id)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "p-3 rounded-lg",
                  career.color
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{career.label}</h4>
                  <p className="text-sm text-muted-foreground">
                    {career.relatedSlugs.length} courses available
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </button>
            );
          })}
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
