import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, ChevronDown, ChevronUp, FileText, BookOpen, History, Tag } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Example {
  id: number;
  input: string;
  output: string;
  explanation?: string;
}

interface ProblemDescriptionPanelProps {
  title: string;
  difficulty: string;
  description: string;
  examples: Example[];
  constraints: string[];
  hints?: string[];
  tags?: string[];
}

const difficultyColors: Record<string, string> = {
  easy: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  hard: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

export function ProblemDescriptionPanel({
  title,
  difficulty,
  description,
  examples,
  constraints,
  hints = [],
  tags = [],
}: ProblemDescriptionPanelProps) {
  const [hintsExpanded, setHintsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Tab Header */}
      <div className="border-b border-border/50 px-4 shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-11 bg-transparent p-0 gap-4">
            <TabsTrigger 
              value="description" 
              className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground flex items-center gap-1.5"
            >
              <FileText className="h-4 w-4" />
              Description
            </TabsTrigger>
            <TabsTrigger 
              value="editorial" 
              className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground flex items-center gap-1.5"
            >
              <BookOpen className="h-4 w-4" />
              Editorial
            </TabsTrigger>
            <TabsTrigger 
              value="submissions" 
              className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground flex items-center gap-1.5"
            >
              <History className="h-4 w-4" />
              Submissions
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <ScrollArea className="flex-1">
        {activeTab === "description" && (
          <div className="p-4 space-y-6">
            {/* Title and Difficulty */}
            <div className="space-y-3">
              <h1 className="text-xl font-semibold">{title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "capitalize font-medium",
                    difficultyColors[difficulty?.toLowerCase()] || difficultyColors.medium
                  )}
                >
                  {difficulty}
                </Badge>
                {tags.map((tag, i) => (
                  <Badge 
                    key={i} 
                    variant="secondary" 
                    className="text-xs font-normal"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div 
                className="text-sm leading-relaxed text-foreground/90"
                dangerouslySetInnerHTML={{ __html: description.replace(/\n/g, '<br/>') }}
              />
            </div>

            {/* Examples */}
            {examples.length > 0 && (
              <div className="space-y-4">
                {examples.map((example) => (
                  <div key={example.id} className="space-y-2">
                    <h3 className="text-sm font-medium">Example {example.id}:</h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2 font-mono text-sm">
                      <div>
                        <span className="text-muted-foreground">Input: </span>
                        <span className="text-foreground">{example.input}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Output: </span>
                        <span className="text-foreground">{example.output}</span>
                      </div>
                      {example.explanation && (
                        <div className="pt-2 border-t border-border/50">
                          <span className="text-muted-foreground">Explanation: </span>
                          <span className="text-foreground/80 font-sans">{example.explanation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Constraints */}
            {constraints.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Constraints:</h3>
                <ul className="space-y-1.5">
                  {constraints.map((constraint, i) => (
                    <li 
                      key={i} 
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-foreground/50 mt-0.5">•</span>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {constraint}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hints */}
            {hints.length > 0 && (
              <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg overflow-hidden">
                <button
                  onClick={() => setHintsExpanded(!hintsExpanded)}
                  className="w-full flex items-center justify-between p-3 hover:bg-amber-500/10 transition-colors"
                >
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Lightbulb className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {hints.length} Hint{hints.length > 1 ? 's' : ''} Available
                    </span>
                  </div>
                  {hintsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  )}
                </button>
                {hintsExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {hints.map((hint, i) => (
                      <div 
                        key={i}
                        className="p-3 bg-amber-500/10 rounded-md text-sm text-foreground/80"
                      >
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          Hint {i + 1}:
                        </span>{' '}
                        {hint}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "editorial" && (
          <div className="p-4">
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Editorial coming soon</p>
            </div>
          </div>
        )}

        {activeTab === "submissions" && (
          <div className="p-4">
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No submissions yet</p>
              <p className="text-xs mt-1">Submit your solution to see history</p>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
