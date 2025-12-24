import { useMemo } from "react";
import { PostVersion } from "@/hooks/usePostVersions";
import { computeWordDiff, DiffSegment } from "@/lib/diffUtils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isChatTranscript, extractChatSegments } from "@/lib/chatContent";

interface VersionDiffViewerProps {
  currentVersion: PostVersion;
  compareVersion: PostVersion | null;
  currentContent?: string;
}

const VersionDiffViewer = ({
  currentVersion,
  compareVersion,
  currentContent,
}: VersionDiffViewerProps) => {
  const diff = useMemo(() => {
    // For diff comparison:
    // - If compareVersion exists, compare compareVersion.content (old) with currentVersion.content (new)
    // - If no compareVersion but currentContent exists and differs, compare currentVersion.content with currentContent
    // - Otherwise show "no previous version" state
    
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
      // For first version, show all content as added
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
    return <ChatDiffView bubbles={diff.data} isFirstVersion={diff.isFirstVersion} />;
  }

  return <RichTextDiffView segments={diff.data} isFirstVersion={diff.isFirstVersion} />;
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
// Render chat diff view
const ChatDiffView = ({
  bubbles,
  isFirstVersion,
}: {
  bubbles: Array<{
    bubble: any;
    status: "unchanged" | "added" | "removed" | "modified";
    oldBubble?: any;
  }>;
  isFirstVersion?: boolean;
}) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "added":
        return "border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20";
      case "removed":
        return "border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 opacity-60";
      case "modified":
        return "border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20";
      default:
        return "border-l-4 border-transparent";
    }
  };

  const getStatusBadge = (status: string) => {
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

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 p-4">
        {bubbles.map((item, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg transition-colors ${getStatusStyles(item.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">
                {item.bubble?.sender === "user" ? "👤 User" : "🤖 Assistant"}
              </span>
              {getStatusBadge(item.status)}
            </div>

            {item.status === "modified" && item.oldBubble && (
              <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm line-through opacity-70">
                {item.oldBubble.content?.substring(0, 100)}
                {item.oldBubble.content?.length > 100 && "..."}
              </div>
            )}

            <div className={`text-sm ${item.status === "removed" ? "line-through" : ""}`}>
              {item.bubble?.content?.substring(0, 200)}
              {item.bubble?.content?.length > 200 && "..."}
            </div>
          </div>
        ))}

        {bubbles.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No differences to display
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

// Render rich text diff view
const RichTextDiffView = ({ segments, isFirstVersion }: { segments: DiffSegment[]; isFirstVersion?: boolean }) => {
  return (
    <ScrollArea className="h-[400px]">
      <div className="prose dark:prose-invert max-w-none p-4">
        {segments.map((segment, index) => {
          switch (segment.type) {
            case "added":
              return (
                <span
                  key={index}
                  className="bg-green-200 dark:bg-green-800/50 px-0.5 rounded"
                  title="Added"
                >
                  {segment.text}
                </span>
              );
            case "removed":
              return (
                <span
                  key={index}
                  className="bg-red-200 dark:bg-red-800/50 line-through px-0.5 rounded text-red-700 dark:text-red-300"
                  title="Removed"
                >
                  {segment.text}
                </span>
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
  );
};

export default VersionDiffViewer;
