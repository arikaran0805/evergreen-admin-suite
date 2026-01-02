import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, Pencil, FileText, Sparkles, Wrench } from "lucide-react";

export type VersioningNoteType = "typo_fix" | "content_update" | "major_revision" | "formatting" | "custom";

interface VersioningNoteOption {
  type: VersioningNoteType;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultSummary: string;
}

const VERSIONING_OPTIONS: VersioningNoteOption[] = [
  {
    type: "typo_fix",
    label: "Typo Fix",
    description: "Minor spelling or grammar corrections",
    icon: <Pencil className="h-4 w-4" />,
    defaultSummary: "Fixed typos and grammar",
  },
  {
    type: "formatting",
    label: "Formatting",
    description: "Layout, styling, or structure changes",
    icon: <FileText className="h-4 w-4" />,
    defaultSummary: "Updated formatting and structure",
  },
  {
    type: "content_update",
    label: "Content Update",
    description: "Added or modified content sections",
    icon: <Sparkles className="h-4 w-4" />,
    defaultSummary: "Updated content",
  },
  {
    type: "major_revision",
    label: "Major Revision",
    description: "Significant changes to the content",
    icon: <Wrench className="h-4 w-4" />,
    defaultSummary: "Major content revision",
  },
];

interface VersioningNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (noteType: VersioningNoteType, changeSummary: string) => void;
  loading?: boolean;
}

export function VersioningNoteDialog({
  open,
  onOpenChange,
  onSave,
  loading = false,
}: VersioningNoteDialogProps) {
  const [selectedType, setSelectedType] = useState<VersioningNoteType | null>(null);
  const [customSummary, setCustomSummary] = useState("");

  const handleSave = () => {
    if (!selectedType) return;
    
    const option = VERSIONING_OPTIONS.find(o => o.type === selectedType);
    const summary = selectedType === "custom" || customSummary.trim() 
      ? customSummary.trim() || option?.defaultSummary || ""
      : option?.defaultSummary || "";
    
    onSave(selectedType, summary);
    
    // Reset state
    setSelectedType(null);
    setCustomSummary("");
  };

  const handleCancel = () => {
    setSelectedType(null);
    setCustomSummary("");
    onOpenChange(false);
  };

  const selectedOption = VERSIONING_OPTIONS.find(o => o.type === selectedType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Draft</DialogTitle>
          <DialogDescription>
            Select the type of changes you made to help track version history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Select Options */}
          <div className="grid grid-cols-2 gap-2">
            {VERSIONING_OPTIONS.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => {
                  setSelectedType(option.type);
                  if (!customSummary) {
                    setCustomSummary("");
                  }
                }}
                className={cn(
                  "relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all hover:bg-accent",
                  selectedType === option.type
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border"
                )}
              >
                {selectedType === option.type && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-muted-foreground">{option.icon}</span>
                  {option.label}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {option.description}
                </p>
              </button>
            ))}
          </div>

          {/* Custom Summary */}
          <div className="space-y-2">
            <Label htmlFor="change-summary" className="text-sm">
              Change Summary{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="change-summary"
              value={customSummary}
              onChange={(e) => setCustomSummary(e.target.value)}
              placeholder={selectedOption?.defaultSummary || "Describe what changed..."}
              className="h-20 resize-none"
            />
            {selectedOption && !customSummary && (
              <p className="text-xs text-muted-foreground">
                Will use: "{selectedOption.defaultSummary}"
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedType || loading}
          >
            {loading ? "Saving..." : "Save Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
