import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, ChevronDown, ChevronUp, ChevronRight, FileText, BookOpen, History, ThumbsUp, ThumbsDown, Share2, MessageSquare, Flag, Bookmark, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

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
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
}: ProblemDescriptionPanelProps) {
  const [hintsExpanded, setHintsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(1234);
  const [dislikeCount, setDislikeCount] = useState(56);
  const [isHovered, setIsHovered] = useState(false);

  // Collapsed state: vertical tabs layout like LeetCode
  if (isCollapsed && !isExpanded) {
    return (
      <div className="h-full w-full flex flex-col bg-card">
        {/* Vertical tabs */}
        <div className="flex-1 flex flex-col py-2">
          <button
            onClick={() => setActiveTab("description")}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-3 text-xs transition-colors border-l-2",
              activeTab === "description" 
                ? "border-primary text-foreground bg-muted/50" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <FileText className="h-5 w-5" />
            <span 
              className="font-medium"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              Description
            </span>
          </button>

          <button
            onClick={() => setActiveTab("editorial")}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-3 text-xs transition-colors border-l-2",
              activeTab === "editorial" 
                ? "border-primary text-foreground bg-muted/50" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <BookOpen className="h-5 w-5" />
            <span 
              className="font-medium"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              Editorial
            </span>
          </button>

          <button
            onClick={() => setActiveTab("submissions")}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-3 text-xs transition-colors border-l-2",
              activeTab === "submissions" 
                ? "border-primary text-foreground bg-muted/50" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <History className="h-5 w-5" />
            <span 
              className="font-medium"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              Submissions
            </span>
          </button>
        </div>

        {/* Bottom buttons */}
        <div className="flex flex-col items-center gap-1 py-3 border-t border-border/50">
          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleExpand}
              title="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleCollapse}
              title="Expand panel"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      setLiked(true);
      setLikeCount(prev => prev + 1);
      if (disliked) {
        setDisliked(false);
        setDislikeCount(prev => prev - 1);
      }
    }
  };

  const handleDislike = () => {
    if (disliked) {
      setDisliked(false);
      setDislikeCount(prev => prev - 1);
    } else {
      setDisliked(true);
      setDislikeCount(prev => prev + 1);
      if (liked) {
        setLiked(false);
        setLikeCount(prev => prev - 1);
      }
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleComment = () => {
    toast.info("Comments feature coming soon!");
  };

  const handleFeedback = () => {
    toast.info("Thank you! Feedback form coming soon.");
  };

  const handleSave = () => {
    setSaved(!saved);
    toast.success(saved ? "Removed from saved" : "Saved to your collection");
  };

  return (
    <div 
      className="h-full flex flex-col bg-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tab Header */}
      <div className="border-b border-border/50 px-4 shrink-0">
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
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
          
          {/* Collapse & Expand Buttons - Show on hover */}
          <div className={cn(
            "flex items-center gap-0.5 shrink-0 transition-opacity",
            isHovered || isExpanded || isCollapsed ? "opacity-100" : "opacity-0"
          )}>
            {onToggleCollapse && !isExpanded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleCollapse}
                title={isCollapsed ? "Show panel" : "Hide panel"}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            )}
            {onToggleExpand && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleExpand}
                title={isExpanded ? "Exit fullscreen" : "Fullscreen"}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
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

      {/* Engagement Footer */}
      <div className="shrink-0 border-t border-border/50 px-4 py-2 bg-muted/20">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Like */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2 gap-1.5",
                      liked && "text-primary"
                    )}
                    onClick={handleLike}
                  >
                    <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
                    <span className="text-xs">{likeCount}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Like</p>
                </TooltipContent>
              </Tooltip>

              {/* Dislike */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2 gap-1.5",
                      disliked && "text-destructive"
                    )}
                    onClick={handleDislike}
                  >
                    <ThumbsDown className={cn("h-4 w-4", disliked && "fill-current")} />
                    <span className="text-xs">{dislikeCount}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Dislike</p>
                </TooltipContent>
              </Tooltip>

              <div className="w-px h-5 bg-border mx-1" />

              {/* Comment */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleComment}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Comments</p>
                </TooltipContent>
              </Tooltip>

              {/* Share */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Share</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1">
              {/* Feedback */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleFeedback}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Report / Feedback</p>
                </TooltipContent>
              </Tooltip>

              {/* Save */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8",
                      saved && "text-primary"
                    )}
                    onClick={handleSave}
                  >
                    <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{saved ? "Unsave" : "Save"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
