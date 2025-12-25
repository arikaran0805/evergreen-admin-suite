import { useMemo, useState } from "react";
import { PostVersion } from "@/hooks/usePostVersions";
import { computeWordDiff, DiffSegment } from "@/lib/diffUtils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { isChatTranscript, extractChatSegments } from "@/lib/chatContent";

interface VersionDiffViewerProps {
  currentVersion: PostVersion;
  compareVersion: PostVersion | null;
  currentContent?: string;
  showHighlightToggle?: boolean;
}

const VersionDiffViewer = ({
  currentVersion,
  compareVersion,
  currentContent,
  showHighlightToggle = true,
}: VersionDiffViewerProps) => {
  const [showHighlights, setShowHighlights] = useState(true);

  const diff = useMemo(() => {
    const hasCompareVersion = compareVersion !== null;
    const oldContent = hasCompareVersion 
      ? compareVersion.content 
      : "";
    const newContent = currentVersion.content;

    // If no old content, show all as "added"
    if (!oldContent) {
      if (isChatTranscript(newContent)) {
        const bubbles = extractChatSegments(newContent, { allowSingle: true });
        return { 
          type: "chat" as const, 
          data: bubbles.map(bubble => ({ bubble, status: "added" as const })),
          isFirstVersion: true
        };
      }
      return { 
        type: "rich" as const, 
        data: [{ type: "added" as const, text: newContent }],
        isFirstVersion: true
      };
    }

    // Check if it's chat content
    if (isChatTranscript(newContent)) {
      return { type: "chat" as const, data: compareChatBubbles(oldContent, newContent), isFirstVersion: false };
    }

    // Rich text diff
    return { type: "rich" as const, data: computeWordDiff(oldContent, newContent), isFirstVersion: false };
  }, [currentVersion, compareVersion, currentContent]);

  if (diff.type === "chat") {
    return (
      <ChatDiffView 
        bubbles={diff.data} 
        isFirstVersion={diff.isFirstVersion}
        showHighlights={showHighlights}
        onToggleHighlights={showHighlightToggle ? setShowHighlights : undefined}
      />
    );
  }

  return (
    <RichTextDiffView 
      segments={diff.data} 
      isFirstVersion={diff.isFirstVersion}
      showHighlights={showHighlights}
      onToggleHighlights={showHighlightToggle ? setShowHighlights : undefined}
    />
  );
};

// Compare chat bubbles and return highlighted version
function compareChatBubbles(oldContent: string, newContent: string) {
  const oldBubbles = extractChatSegments(oldContent, { allowSingle: true });
  const newBubbles = extractChatSegments(newContent, { allowSingle: true });

  const result: Array<{
    bubble: any;
    status: "unchanged" | "added" | "removed" | "modified";
    oldBubble?: any;
  }> = [];

  const maxLen = Math.max(oldBubbles.length, newBubbles.length);

  for (let i = 0; i < maxLen; i++) {
    const oldBubble = oldBubbles[i];
    const newBubble = newBubbles[i];

    if (!oldBubble && newBubble) {
      result.push({ bubble: newBubble, status: "added" });
    } else if (oldBubble && !newBubble) {
      result.push({ bubble: oldBubble, status: "removed" });
    } else if (JSON.stringify(oldBubble) !== JSON.stringify(newBubble)) {
      result.push({ bubble: newBubble, status: "modified", oldBubble });
    } else {
      result.push({ bubble: newBubble, status: "unchanged" });
    }
  }

  return result;
}

// Highlight toggle component
const HighlightToggle = ({
  showHighlights,
  onToggle,
}: {
  showHighlights: boolean;
  onToggle?: (value: boolean) => void;
}) => {
  if (!onToggle) return null;
  
  return (
    <div className="flex items-center gap-2 mb-4 p-2 bg-muted/30 rounded-lg">
      <Switch
        id="inline-highlight-toggle"
        checked={showHighlights}
        onCheckedChange={onToggle}
      />
      <Label htmlFor="inline-highlight-toggle" className="text-sm cursor-pointer">
        Show highlights
      </Label>
    </div>
  );
};

// Render word-level diff for inline view
const renderInlineWordDiff = (oldText: string, newText: string) => {
  const diff = computeWordDiff(oldText, newText);
  
  return diff.map((segment, index) => {
    if (segment.type === "unchanged") {
      return <span key={index}>{segment.text}</span>;
    }
    if (segment.type === "removed") {
      return (
        <span
          key={index}
          className="bg-red-200 dark:bg-red-800/50 line-through text-red-700 dark:text-red-300 px-0.5 rounded"
        >
          {segment.text}
        </span>
      );
    }
    if (segment.type === "added") {
      return (
        <span
          key={index}
          className="bg-green-200 dark:bg-green-800/50 text-green-800 dark:text-green-200 px-0.5 rounded"
        >
          {segment.text}
        </span>
      );
    }
    return <span key={index}>{segment.text}</span>;
  });
};

// Chat bubble for inline diff view
const InlineChatBubble = ({
  bubble,
  status,
  oldBubble,
  showHighlights,
}: {
  bubble: any;
  status: string;
  oldBubble?: any;
  showHighlights: boolean;
}) => {
  const isMentor = bubble?.speaker?.toLowerCase() === "karan";
  
  const getStatusRing = () => {
    if (!showHighlights) return "";
    switch (status) {
      case "added":
        return "ring-2 ring-green-400 dark:ring-green-600";
      case "removed":
        return "ring-2 ring-red-400 dark:ring-red-600";
      case "modified":
        return "ring-2 ring-amber-400 dark:ring-amber-600";
      default:
        return "";
    }
  };

  const getStatusBadge = () => {
    if (!showHighlights) return null;
    switch (status) {
      case "added":
        return <Badge className="bg-green-500 text-white text-xs">Added</Badge>;
      case "removed":
        return <Badge className="bg-red-500 text-white text-xs">Removed</Badge>;
      case "modified":
        return <Badge className="bg-amber-500 text-white text-xs">Modified</Badge>;
      default:
        return null;
    }
  };

  // Render word-level diff content for modified bubbles
  const renderContent = () => {
    if (status === "modified" && oldBubble && showHighlights) {
      return renderInlineWordDiff(oldBubble.content || "", bubble?.content || "");
    }
    return bubble?.content;
  };
  
  return (
    <div className="relative">
      {/* Status badge */}
      <div className="absolute -top-2 right-2 z-10">
        {getStatusBadge()}
      </div>
      
      <div
        className={`flex items-end gap-2.5 ${isMentor ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md ${
            isMentor
              ? "bg-gradient-to-br from-blue-400 to-blue-600"
              : "bg-gradient-to-br from-muted to-muted/80"
          }`}
        >
          {isMentor ? "👨‍💻" : "🤖"}
        </div>

        {/* Bubble */}
        <div
          className={`relative max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm ${
            isMentor
              ? "bg-gradient-to-br from-[hsl(210,100%,52%)] to-[hsl(210,100%,45%)] text-white rounded-br-md"
              : "bg-muted/80 text-foreground rounded-bl-md border border-border/30"
          } ${getStatusRing()} ${status === "removed" && showHighlights ? "opacity-60" : ""}`}
        >
          {/* Speaker indicator */}
          <div
            className={`text-[10px] font-semibold mb-1 tracking-wide uppercase ${
              isMentor ? "text-blue-100/80" : "text-primary"
            }`}
          >
            {bubble?.speaker || "Assistant"}
          </div>

          {/* Content with word-level diff */}
          <div className={`text-sm leading-relaxed ${status === "removed" && showHighlights ? "line-through" : ""}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Render chat diff view
const ChatDiffView = ({
  bubbles,
  isFirstVersion,
  showHighlights,
  onToggleHighlights,
}: {
  bubbles: Array<{
    bubble: any;
    status: "unchanged" | "added" | "removed" | "modified";
    oldBubble?: any;
  }>;
  isFirstVersion?: boolean;
  showHighlights: boolean;
  onToggleHighlights?: (value: boolean) => void;
}) => {
  return (
    <div>
      <HighlightToggle showHighlights={showHighlights} onToggle={onToggleHighlights} />
      <div className="border rounded-2xl overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center text-xs shadow">
              🤖
            </div>
            <span className="text-sm font-medium">Inline Diff View</span>
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {bubbles.map((item, index) => (
              <InlineChatBubble
                key={index}
                bubble={item.bubble}
                status={item.status}
                oldBubble={item.oldBubble}
                showHighlights={showHighlights}
              />
            ))}

            {bubbles.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No differences to display
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

// Render rich text diff view with proper highlighting
const RichTextDiffView = ({ 
  segments, 
  isFirstVersion,
  showHighlights,
  onToggleHighlights,
}: { 
  segments: DiffSegment[]; 
  isFirstVersion?: boolean;
  showHighlights: boolean;
  onToggleHighlights?: (value: boolean) => void;
}) => {
  return (
    <div>
      <HighlightToggle showHighlights={showHighlights} onToggle={onToggleHighlights} />
      <ScrollArea className="h-[400px]">
        <div className="prose dark:prose-invert max-w-none p-4">
          {segments.map((segment, index) => {
            if (!showHighlights) {
              if (segment.type === "removed") return null;
              return <span key={index} dangerouslySetInnerHTML={{ __html: segment.text }} />;
            }
            
            switch (segment.type) {
              case "added":
                return (
                  <span
                    key={index}
                    className="bg-green-200 dark:bg-green-800/50 text-green-900 dark:text-green-100 px-0.5 rounded"
                    title="Added"
                    dangerouslySetInnerHTML={{ __html: segment.text }}
                  />
                );
              case "removed":
                return (
                  <span
                    key={index}
                    className="bg-red-200 dark:bg-red-800/50 line-through px-0.5 rounded text-red-700 dark:text-red-300"
                    title="Removed"
                    dangerouslySetInnerHTML={{ __html: segment.text }}
                  />
                );
              default:
                return <span key={index} dangerouslySetInnerHTML={{ __html: segment.text }} />;
            }
          })}

          {segments.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No content to display
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default VersionDiffViewer;
