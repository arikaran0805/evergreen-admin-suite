import { useState } from "react";
import { PostVersion } from "@/hooks/usePostVersions";
import { computeWordDiff, DiffSegment } from "@/lib/diffUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { isChatTranscript, extractChatSegments } from "@/lib/chatContent";
import { format } from "date-fns";
import { User, Shield } from "lucide-react";

interface SideBySideComparisonProps {
  oldVersion: PostVersion;
  newVersion: PostVersion;
}

const SideBySideComparison = ({
  oldVersion,
  newVersion,
}: SideBySideComparisonProps) => {
  const [showHighlights, setShowHighlights] = useState(true);

  const isChatContent = isChatTranscript(newVersion.content);

  if (isChatContent) {
    return (
      <ChatSideBySide
        oldVersion={oldVersion}
        newVersion={newVersion}
        showHighlights={showHighlights}
        onToggleHighlights={setShowHighlights}
      />
    );
  }

  return (
    <RichTextSideBySide
      oldVersion={oldVersion}
      newVersion={newVersion}
      showHighlights={showHighlights}
      onToggleHighlights={setShowHighlights}
    />
  );
};

interface SideBySideProps {
  oldVersion: PostVersion;
  newVersion: PostVersion;
  showHighlights: boolean;
  onToggleHighlights: (value: boolean) => void;
}

const VersionHeader = ({ version, label }: { version: PostVersion; label: string }) => (
  <div className="p-3 bg-muted/50 border-b">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">{label}</span>
        <Badge variant="secondary">v{version.version_number}</Badge>
        {version.editor_role === "admin" ? (
          <Badge className="bg-primary text-primary-foreground gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <User className="h-3 w-3" />
            Moderator
          </Badge>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {format(new Date(version.created_at), "MMM d, yyyy h:mm a")}
      </span>
    </div>
    <div className="text-xs text-muted-foreground mt-1">
      By: {version.editor_profile?.full_name || version.editor_profile?.email || "Unknown"}
    </div>
  </div>
);

const HighlightToggle = ({
  showHighlights,
  onToggle,
}: {
  showHighlights: boolean;
  onToggle: (value: boolean) => void;
}) => (
  <div className="flex items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
    <Switch
      id="highlight-toggle"
      checked={showHighlights}
      onCheckedChange={onToggle}
    />
    <Label htmlFor="highlight-toggle" className="text-sm cursor-pointer">
      Show change highlights
    </Label>
    {showHighlights && (
      <div className="flex items-center gap-4 ml-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-300 dark:bg-amber-600" />
          <span>Modified</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-300 dark:bg-green-700" />
          <span>Added</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-300 dark:bg-red-700" />
          <span>Removed</span>
        </div>
      </div>
    )}
  </div>
);

const RichTextSideBySide = ({
  oldVersion,
  newVersion,
  showHighlights,
  onToggleHighlights,
}: SideBySideProps) => {
  const diff = computeWordDiff(oldVersion.content, newVersion.content);

  // Separate segments into old and new views
  const renderOldContent = () => {
    if (!showHighlights) {
      return <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: oldVersion.content }} />;
    }

    return (
      <div className="prose dark:prose-invert max-w-none">
        {diff.map((segment, index) => {
          if (segment.type === "added") {
            return null; // Don't show added content in old view
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
          return <span key={index} dangerouslySetInnerHTML={{ __html: segment.text }} />;
        })}
      </div>
    );
  };

  const renderNewContent = () => {
    if (!showHighlights) {
      return <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: newVersion.content }} />;
    }

    return (
      <div className="prose dark:prose-invert max-w-none">
        {diff.map((segment, index) => {
          if (segment.type === "removed") {
            return null; // Don't show removed content in new view
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
          // Check if this unchanged segment is adjacent to changes
          const prevSegment = diff[index - 1];
          const nextSegment = diff[index + 1];
          const isNearChange = prevSegment?.type !== "unchanged" || nextSegment?.type !== "unchanged";
          
          if (isNearChange && prevSegment?.type === "removed" && nextSegment?.type === "added") {
            return (
              <span
                key={index}
                className="bg-amber-100 dark:bg-amber-800/30 px-0.5 rounded"
                dangerouslySetInnerHTML={{ __html: segment.text }}
              />
            );
          }
          return <span key={index} dangerouslySetInnerHTML={{ __html: segment.text }} />;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <HighlightToggle showHighlights={showHighlights} onToggle={onToggleHighlights} />
      
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg overflow-hidden">
          <VersionHeader version={oldVersion} label="Previous Version" />
          <ScrollArea className="h-[400px]">
            <div className="p-4">{renderOldContent()}</div>
          </ScrollArea>
        </div>
        
        <div className="border rounded-lg overflow-hidden border-primary/50">
          <VersionHeader version={newVersion} label="Updated Version" />
          <ScrollArea className="h-[400px]">
            <div className="p-4">{renderNewContent()}</div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

const ChatSideBySide = ({
  oldVersion,
  newVersion,
  showHighlights,
  onToggleHighlights,
}: SideBySideProps) => {
  const oldBubbles = extractChatSegments(oldVersion.content, { allowSingle: true });
  const newBubbles = extractChatSegments(newVersion.content, { allowSingle: true });

  // Compare bubbles
  const maxLen = Math.max(oldBubbles.length, newBubbles.length);
  const bubbleComparisons: Array<{
    oldBubble: any;
    newBubble: any;
    status: "unchanged" | "added" | "removed" | "modified";
  }> = [];

  for (let i = 0; i < maxLen; i++) {
    const oldBubble = oldBubbles[i];
    const newBubble = newBubbles[i];

    if (!oldBubble && newBubble) {
      bubbleComparisons.push({ oldBubble: null, newBubble, status: "added" });
    } else if (oldBubble && !newBubble) {
      bubbleComparisons.push({ oldBubble, newBubble: null, status: "removed" });
    } else if (JSON.stringify(oldBubble) !== JSON.stringify(newBubble)) {
      bubbleComparisons.push({ oldBubble, newBubble, status: "modified" });
    } else {
      bubbleComparisons.push({ oldBubble, newBubble, status: "unchanged" });
    }
  }

  const getStatusStyles = (status: string, isOld: boolean) => {
    if (!showHighlights) return "";
    
    switch (status) {
      case "added":
        return isOld ? "opacity-0" : "border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20";
      case "removed":
        return isOld ? "border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20" : "opacity-0";
      case "modified":
        return `border-l-4 border-amber-500 ${isOld ? "bg-red-50 dark:bg-red-900/10" : "bg-amber-50 dark:bg-amber-900/20"}`;
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      <HighlightToggle showHighlights={showHighlights} onToggle={onToggleHighlights} />
      
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg overflow-hidden">
          <VersionHeader version={oldVersion} label="Previous Version" />
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              {bubbleComparisons.map((comp, index) => {
                if (!comp.oldBubble) {
                  return showHighlights ? (
                    <div key={index} className="h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                      New message added
                    </div>
                  ) : null;
                }
                
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg transition-colors ${getStatusStyles(comp.status, true)}`}
                  >
                    <span className="text-xs text-muted-foreground font-medium">
                      {comp.oldBubble?.sender === "user" ? "👤 User" : "🤖 Assistant"}
                    </span>
                    <div className={`text-sm mt-1 ${comp.status === "removed" && showHighlights ? "line-through" : ""}`}>
                      {comp.oldBubble?.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
        
        <div className="border rounded-lg overflow-hidden border-primary/50">
          <VersionHeader version={newVersion} label="Updated Version" />
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              {bubbleComparisons.map((comp, index) => {
                if (!comp.newBubble) {
                  return showHighlights ? (
                    <div key={index} className="h-16 border-2 border-dashed border-red-300 dark:border-red-700 rounded-lg flex items-center justify-center text-xs text-red-500">
                      Message removed
                    </div>
                  ) : null;
                }
                
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg transition-colors ${getStatusStyles(comp.status, false)}`}
                  >
                    <span className="text-xs text-muted-foreground font-medium">
                      {comp.newBubble?.sender === "user" ? "👤 User" : "🤖 Assistant"}
                    </span>
                    <div className="text-sm mt-1">{comp.newBubble?.content}</div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default SideBySideComparison;
