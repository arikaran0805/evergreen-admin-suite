/**
 * PredictCodePanel
 * Read-only Monaco code viewer panel for the Predict workspace left side.
 * Includes engagement footer (Like, Dislike, Comment, Share, Report, Save).
 */
import { useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Braces,
  Copy,
  Check,
  Maximize,
  Expand,
  Shrink,
  PanelTopOpen,
  PanelTopClose,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Flag,
  Bookmark,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ShareTooltip from "@/components/ShareTooltip";
import ReportSuggestDialog from "@/components/ReportSuggestDialog";
import { ProblemCommentsSection } from "@/components/practice/ProblemCommentsSection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PredictOutputProblem } from "@/hooks/usePredictOutputProblems";

interface PredictCodePanelProps {
  problem: PredictOutputProblem;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const monacoLanguageMap: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  java: "java",
  c: "c",
  cpp: "cpp",
  sql: "sql",
};

export function PredictCodePanel({
  problem,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
}: PredictCodePanelProps) {
  const { theme } = useTheme();
  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Engagement state
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [saved, setSaved] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(problem.code);
    setCopied(true);
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 2000);
  }, [problem.code]);

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikes((l) => l - 1);
    } else {
      setLiked(true);
      setLikes((l) => l + 1);
      if (disliked) {
        setDisliked(false);
        setDislikes((d) => d - 1);
      }
    }
  };

  const handleDislike = () => {
    if (disliked) {
      setDisliked(false);
      setDislikes((d) => d - 1);
    } else {
      setDisliked(true);
      setDislikes((d) => d + 1);
      if (liked) {
        setLiked(false);
        setLikes((l) => l - 1);
      }
    }
  };

  // Collapsed state
  if (isCollapsed && !isExpanded) {
    return (
      <div
        className="h-full flex flex-col items-center bg-card py-3 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Braces className="h-4 w-4 text-primary mb-2" />
        <span
          className="font-medium text-xs text-muted-foreground"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          Code
        </span>
        <div className="mt-auto flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleCollapse}>
              <PanelTopOpen className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-card overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Braces className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Code</span>
          <Badge variant="outline" className="text-xs capitalize h-6">
            {problem.language}
          </Badge>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="Copy code">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => document.documentElement.requestFullscreen()}
            title="Fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </Button>
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
              <PanelTopClose className="h-4 w-4" />
            </Button>
          )}
          {onToggleExpand && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
              {isExpanded ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          value={problem.code}
          language={monacoLanguageMap[problem.language] || problem.language}
          theme={monacoTheme}
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            lineNumbersMinChars: 1,
            lineDecorationsWidth: 8,
            glyphMargin: false,
            renderLineHighlight: "line",
            folding: true,
            contextmenu: false,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            padding: { top: 16, bottom: 16 },
            scrollbar: { vertical: "auto", horizontal: "auto" },
            wordWrap: "on",
            dragAndDrop: false,
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            bracketPairColorization: { enabled: true },
            guides: { indentation: true, bracketPairs: true },
            smoothScrolling: true,
          }}
        />
      </div>

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
                    className={cn("h-8 px-2 gap-1.5", liked && "text-primary")}
                    onClick={handleLike}
                  >
                    <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
                    <span className="text-xs">{likes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Like</p></TooltipContent>
              </Tooltip>

              {/* Dislike */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 px-2 gap-1.5", disliked && "text-destructive")}
                    onClick={handleDislike}
                  >
                    <ThumbsDown className={cn("h-4 w-4", disliked && "fill-current")} />
                    <span className="text-xs">{dislikes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Dislike</p></TooltipContent>
              </Tooltip>

              <div className="w-px h-5 bg-border mx-1" />

              {/* Comment */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCommentDialogOpen(true)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Comments</p></TooltipContent>
              </Tooltip>

              {/* Share */}
              <ShareTooltip title={problem.title} url={window.location.href}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Share2 className="h-4 w-4" />
                </Button>
              </ShareTooltip>
            </div>

            <div className="flex items-center gap-1">
              {/* Feedback */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setReportDialogOpen(true)}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Report / Feedback</p></TooltipContent>
              </Tooltip>

              {/* Save */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", saved && "text-primary")}
                    onClick={() => setSaved((s) => !s)}
                  >
                    <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>{saved ? "Unsave" : "Save"}</p></TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Report Dialog */}
      <ReportSuggestDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        contentType="problem"
        contentId={problem.id}
        contentTitle={problem.title}
        type="report"
      />

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ProblemCommentsSection problemId={problem.id} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
