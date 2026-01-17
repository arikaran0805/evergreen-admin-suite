import { Briefcase, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Career } from "../types";

interface CanvasCareerSelectorProps {
  careers: Career[];
  onSelect: (career: Career) => void;
  onClose: () => void;
}

const CanvasCareerSelector = ({ careers, onSelect, onClose }: CanvasCareerSelectorProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Select Career</h2>
              <p className="text-xs text-muted-foreground">Choose the career for this team</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Career List */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-2">
            {careers.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No careers available</p>
              </div>
            ) : (
              careers.map((career) => (
                <button
                  key={career.id}
                  onClick={() => onSelect(career)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all group text-left"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                    style={{ backgroundColor: career.color || "hsl(var(--primary))" }}
                  >
                    {career.icon || career.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {career.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">/{career.slug}</p>
                  </div>
                  <div className="text-muted-foreground group-hover:text-primary transition-colors">
                    →
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

export default CanvasCareerSelector;
