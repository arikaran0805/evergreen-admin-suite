/**
 * PredictOutputLearnerPreview
 * Live preview of how the problem looks to a learner (used in admin editor right panel).
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  difficulty: string;
  language: string;
  tags: string[];
  prompt: string;
  code: string;
  expected_output: string;
}

const difficultyColor: Record<string, string> = {
  Easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function PredictOutputLearnerPreview({
  title, difficulty, language, tags, prompt, code, expected_output,
}: Props) {
  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-foreground leading-tight">{title || "Untitled"}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("text-xs", difficultyColor[difficulty])}>{difficulty}</Badge>
          <Badge variant="outline" className="text-xs capitalize">{language}</Badge>
          {tags.slice(0, 2).map(t => (
            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
          ))}
          {tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">+{tags.length - 2}</Badge>
          )}
        </div>
      </div>

      {/* Prompt */}
      {prompt && (
        <p className="text-sm text-muted-foreground">{prompt}</p>
      )}

      {/* Code Block */}
      <div className="relative group rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground capitalize">{language}</span>
          <button className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <Copy className="h-3 w-3" />Copy
          </button>
        </div>
        <pre className="p-4 overflow-x-auto bg-background">
          <code className="text-sm font-mono text-foreground whitespace-pre">
            {code || "// Write code here..."}
          </code>
        </pre>
      </div>

      {/* Input Area */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Your Output</label>
        <Textarea
          disabled
          placeholder="Type the exact output of the above code"
          className="font-mono text-sm min-h-[80px] bg-background"
        />
        <p className="text-xs text-muted-foreground">
          Match line breaks and spacing as shown in output
        </p>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3">
        <Button disabled className="flex-1">Submit Answer</Button>
        <Button variant="outline" disabled className="gap-1.5">
          <Eye className="h-4 w-4" />Reveal
        </Button>
      </div>
    </div>
  );
}
