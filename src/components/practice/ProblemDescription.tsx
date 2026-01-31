import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { ProblemDetail } from "./problemDetailData";
import { cn } from "@/lib/utils";

interface ProblemDescriptionProps {
  problem: ProblemDetail;
}

const difficultyColors = {
  Easy: "bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20",
  Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20",
  Hard: "bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20",
};

export function ProblemDescription({ problem }: ProblemDescriptionProps) {
  const [showHints, setShowHints] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  return (
    <div className="h-full min-h-0 flex flex-col bg-card">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 min-h-0 flex flex-col"
      >
        <div className="border-b border-border/50 px-4">
          <TabsList className="h-11 bg-transparent p-0 gap-4">
            <TabsTrigger 
              value="description" 
              className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground"
            >
              Description
            </TabsTrigger>
            <TabsTrigger 
              value="solutions" 
              className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground"
            >
              Solutions
            </TabsTrigger>
            <TabsTrigger 
              value="submissions" 
              className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground"
            >
              Submissions
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="description" className="flex-1 min-h-0 overflow-auto m-0 p-0">
          <div className="p-6 space-y-6">
            {/* Title and Difficulty */}
            <div>
              <h1 className="text-xl font-semibold text-foreground mb-3">{problem.title}</h1>
              <Badge variant="outline" className={cn("text-xs font-medium", difficultyColors[problem.difficulty])}>
                {problem.difficulty}
              </Badge>
            </div>

            {/* Description */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {problem.description.split('\n').map((line, i) => {
                if (line.startsWith('- ')) {
                  return <li key={i} className="text-sm text-foreground/90">{line.slice(2)}</li>;
                }
                if (line.includes('`')) {
                  const parts = line.split(/(`[^`]+`)/g);
                  return (
                    <p key={i} className="text-sm text-foreground/90 mb-2">
                      {parts.map((part, j) => 
                        part.startsWith('`') ? (
                          <code key={j} className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                            {part.slice(1, -1)}
                          </code>
                        ) : part
                      )}
                    </p>
                  );
                }
                if (line.includes('**')) {
                  const parts = line.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p key={i} className="text-sm text-foreground/90 mb-2">
                      {parts.map((part, j) => 
                        part.startsWith('**') ? (
                          <strong key={j}>{part.slice(2, -2)}</strong>
                        ) : part
                      )}
                    </p>
                  );
                }
                return line ? <p key={i} className="text-sm text-foreground/90 mb-2">{line}</p> : <br key={i} />;
              })}
            </div>

            {/* Examples */}
            <div className="space-y-4">
              {problem.examples.map((example, i) => (
                <div key={i} className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Example {i + 1}:</h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 font-mono text-sm">
                    <div>
                      <span className="text-muted-foreground">Input: </span>
                      <span className="text-foreground whitespace-pre-wrap">{example.input}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Output: </span>
                      <span className="text-foreground">{example.output}</span>
                    </div>
                    {example.explanation && (
                      <div>
                        <span className="text-muted-foreground">Explanation: </span>
                        <span className="text-foreground">{example.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Constraints */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Constraints:</h3>
              <ul className="space-y-1">
                {problem.constraints.map((constraint, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <code className="text-xs">{constraint}</code>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hints */}
            {problem.hints && problem.hints.length > 0 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHints(!showHints)}
                  className="text-muted-foreground hover:text-foreground gap-2 px-0"
                >
                  <Lightbulb className="h-4 w-4" />
                  {showHints ? 'Hide' : 'Show'} Hints ({problem.hints.length})
                  {showHints ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {showHints && (
                  <div className="mt-3 space-y-2">
                    {problem.hints.map((hint, i) => (
                      <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                        <p className="text-sm text-foreground/80">
                          <span className="font-medium text-amber-600 dark:text-amber-500">Hint {i + 1}: </span>
                          {hint}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="solutions" className="flex-1 min-h-0 overflow-auto m-0 p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Solutions will be available after you solve the problem.</p>
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="flex-1 min-h-0 overflow-auto m-0 p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">No submissions yet.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
