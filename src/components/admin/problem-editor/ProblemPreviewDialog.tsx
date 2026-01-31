import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TestCase } from "./TestCasesSection";
import type { SupportedLanguage } from "./SupportedLanguagesSection";

interface ProblemPreviewDialogProps {
  title: string;
  difficulty: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  hints: string[];
  tags: string[];
  testCases: TestCase[];
  starterCode: Record<string, string>;
  selectedLanguages: SupportedLanguage[];
  timeLimit: number;
  memoryLimit: number;
}

export function ProblemPreviewDialog({
  title,
  difficulty,
  description,
  inputFormat,
  outputFormat,
  examples,
  constraints,
  hints,
  tags,
  testCases,
  starterCode,
  selectedLanguages,
  timeLimit,
  memoryLimit,
}: ProblemPreviewDialogProps) {
  const visibleTestCases = testCases.filter((tc) => tc.is_visible);
  const getDifficultyColor = (d: string) => {
    switch (d) {
      case "Easy":
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
      case "Medium":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
      case "Hard":
        return "text-red-600 bg-red-100 dark:bg-red-900/30";
      default:
        return "";
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Eye className="h-4 w-4" />
          Preview as Learner
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{title || "Untitled Problem"}</span>
            <Badge className={getDifficultyColor(difficulty)}>{difficulty}</Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Limits */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Time Limit: {timeLimit}ms</span>
              <span>Memory Limit: {memoryLimit}MB</span>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {description || <span className="text-muted-foreground">No description provided.</span>}
              </div>
            </div>

            {/* Input/Output Format */}
            {(inputFormat || outputFormat) && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inputFormat && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Input Format</h4>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {inputFormat}
                      </div>
                    </div>
                  )}
                  {outputFormat && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Output Format</h4>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {outputFormat}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Examples */}
            {examples.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Examples</h3>
                  <div className="space-y-4">
                    {examples.map((ex, i) => (
                      <div key={i} className="border rounded-lg p-4 bg-muted/30">
                        <p className="text-sm font-medium mb-2">Example {i + 1}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs text-muted-foreground">Input:</span>
                            <pre className="mt-1 p-2 bg-background rounded text-sm font-mono">
                              {ex.input}
                            </pre>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Output:</span>
                            <pre className="mt-1 p-2 bg-background rounded text-sm font-mono">
                              {ex.output}
                            </pre>
                          </div>
                        </div>
                        {ex.explanation && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            <strong>Explanation:</strong> {ex.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Visible Test Cases */}
            {visibleTestCases.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Sample Test Cases</h3>
                  <div className="space-y-3">
                    {visibleTestCases.map((tc, i) => (
                      <div key={tc.id} className="border rounded-lg p-3 bg-muted/20">
                        <p className="text-xs text-muted-foreground mb-2">Test Case {i + 1}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs">Input:</span>
                            <pre className="mt-1 p-2 bg-background rounded text-xs font-mono">
                              {tc.input}
                            </pre>
                          </div>
                          <div>
                            <span className="text-xs">Expected:</span>
                            <pre className="mt-1 p-2 bg-background rounded text-xs font-mono">
                              {tc.expected_output}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Constraints */}
            {constraints.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Constraints</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {constraints.map((c, i) => (
                      <li key={i} className="font-mono">{c}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Hints Preview */}
            {hints.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Hints Available</h3>
                  <p className="text-sm text-muted-foreground">
                    {hints.length} hint{hints.length !== 1 ? "s" : ""} available for this problem.
                  </p>
                </div>
              </>
            )}

            {/* Starter Code Preview */}
            {selectedLanguages.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Starter Code</h3>
                  <div className="space-y-2">
                    {selectedLanguages.map((lang) => (
                      <div key={lang}>
                        <p className="text-xs font-medium mb-1 capitalize">{lang}</p>
                        <pre className="p-3 bg-muted/50 rounded text-xs font-mono overflow-x-auto">
                          {starterCode[lang] || `// No starter code for ${lang}`}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
