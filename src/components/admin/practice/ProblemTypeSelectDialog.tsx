/**
 * ProblemTypeSelectDialog
 * Popup card that lets admins choose between "Problem Solving" and "Predict the Output"
 * before creating a new problem.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Code2, Eye, Bug, ArrowRight } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProblemSolving: () => void;
  onSelectPredictOutput: () => void;
  onSelectFixError?: () => void;
}

const problemTypes = [
  {
    key: "problem-solving" as const,
    icon: Code2,
    title: "Problem Solving",
    description: "Write code to solve algorithmic challenges with test cases and automated judging.",
    tags: ["Test Cases", "Multi-language", "Auto-graded"],
    accentClass: "border-primary/20 hover:border-primary/50 hover:bg-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    key: "predict-output" as const,
    icon: Eye,
    title: "Predict the Output",
    description: "Read code and type the exact output. Designed for mental execution and tricky traps.",
    tags: ["Typed Answer", "Matching Modes", "Streak-ready"],
    accentClass: "border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/5",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  {
    key: "fix-error" as const,
    icon: Bug,
    title: "Fix the Error",
    description: "Present broken code for learners to debug. Tests real problem-solving and code reading skills.",
    tags: ["Debugging", "Code Fix", "Error Analysis"],
    accentClass: "border-destructive/20 hover:border-destructive/50 hover:bg-destructive/5",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
];

export function ProblemTypeSelectDialog({
  open,
  onOpenChange,
  onSelectProblemSolving,
  onSelectPredictOutput,
  onSelectFixError,
}: Props) {
  const handleSelect = (key: string) => {
    onOpenChange(false);
    if (key === "problem-solving") {
      onSelectProblemSolving();
    } else if (key === "predict-output") {
      onSelectPredictOutput();
    } else if (key === "fix-error") {
      onSelectFixError?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg">Choose Problem Type</DialogTitle>
          <DialogDescription className="text-sm">
            Select the type of problem you want to create.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-3">
          {problemTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.key}
                onClick={() => handleSelect(type.key)}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer text-left group ${type.accentClass}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${type.iconBg}`}>
                  <Icon className={`h-5 w-5 ${type.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-foreground">{type.title}</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {type.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {type.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
