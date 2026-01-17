import { Briefcase } from "lucide-react";
import type { Career } from "../types";

interface CanvasCareerNodeProps {
  career: Career | null;
}

const CanvasCareerNode = ({ career }: CanvasCareerNodeProps) => {
  if (!career) {
    return (
      <div className="flex justify-center">
        <div className="px-6 py-4 rounded-xl bg-muted text-muted-foreground">
          No career assigned
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div
        className="flex items-center gap-4 px-6 py-4 rounded-xl border-2 shadow-sm"
        style={{
          backgroundColor: `${career.color}10`,
          borderColor: career.color,
        }}
      >
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: career.color }}
        >
          {career.icon || <Briefcase className="h-6 w-6" />}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Career</p>
          <h2 className="text-xl font-semibold text-foreground">{career.name}</h2>
        </div>
      </div>
    </div>
  );
};

export default CanvasCareerNode;
