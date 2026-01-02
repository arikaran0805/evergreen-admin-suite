import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { PostVersion } from "@/hooks/usePostVersions";
import { useVersionBookmarks } from "@/hooks/useVersionBookmarks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, RotateCcw, Upload, Eye, CheckCircle, GitCompare, Shield, User, AlertTriangle, ArrowLeftRight, ExternalLink, Bookmark, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VersioningNoteType } from "@/components/VersioningNoteDialog";
import VersionDiffViewer from "@/components/VersionDiffViewer";
import SideBySideComparison from "@/components/SideBySideComparison";
import { isChatTranscript, extractChatSegments } from "@/lib/chatContent";

interface VersionHistoryPanelProps {
  versions: PostVersion[];
  loading: boolean;
  isAdmin: boolean;
  currentContent?: string;
  onRestore: (version: PostVersion) => void;
  onPublish: (version: PostVersion) => void;
  onPreview: (version: PostVersion) => void;
  onUpdateNote?: (versionId: string, noteType: string | null, summary: string | null) => Promise<boolean>;
}

const VERSIONING_OPTIONS: { type: VersioningNoteType; label: string }[] = [
  { type: "typo_fix", label: "Typo Fix" },
  { type: "formatting", label: "Formatting" },
  { type: "content_update", label: "Content Update" },
  { type: "major_revision", label: "Major Revision" },
];

const VersionHistoryPanel = ({
  versions,
  loading,
  isAdmin,
  currentContent,
  onRestore,
  onPublish,
  onPreview,
  onUpdateNote,
}: VersionHistoryPanelProps) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [selectedVersion, setSelectedVersion] = useState<PostVersion | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [editNoteDialogOpen, setEditNoteDialogOpen] = useState(false);
  const [editNoteType, setEditNoteType] = useState<string | null>(null);
  const [editNoteSummary, setEditNoteSummary] = useState("");
  const [editNoteLoading, setEditNoteLoading] = useState(false);
  const [compareVersion, setCompareVersion] = useState<PostVersion | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<"inline" | "side-by-side">("side-by-side");
  const [hoveredVersionId, setHoveredVersionId] = useState<string | null>(null);

  // Version bookmarks
  const { isBookmarked, toggleBookmark } = useVersionBookmarks(id);

  // Group versions by status and bookmarks
  const groupedVersions = useMemo(() => {
    const bookmarked = versions.filter(v => isBookmarked(v.id));
    const published = versions.filter(v => v.status === "published" && !isBookmarked(v.id));
    const unpublished = versions.filter(v => (v.status === "draft" || v.status === "archived") && !isBookmarked(v.id));
    return { bookmarked, published, unpublished };
  }, [versions, isBookmarked]);

  const handlePublishClick = (version: PostVersion) => {
    setSelectedVersion(version);
    setPublishDialogOpen(true);
  };

  const handleConfirmPublish = () => {
    if (selectedVersion) {
      onPublish(selectedVersion);
      setPublishDialogOpen(false);
    }
  };

  const handleRevertClick = (version: PostVersion) => {
    setSelectedVersion(version);
    setRevertDialogOpen(true);
  };

  const handleConfirmRevert = () => {
    if (selectedVersion) {
      onRestore(selectedVersion);
      setRevertDialogOpen(false);
    }
  };

  const handleEditNoteClick = (version: PostVersion) => {
    setSelectedVersion(version);
    setEditNoteType(version.versioning_note_type || null);
    setEditNoteSummary(version.change_summary || "");
    setEditNoteDialogOpen(true);
  };

  const handleConfirmEditNote = async () => {
    if (selectedVersion && onUpdateNote) {
      setEditNoteLoading(true);
      const success = await onUpdateNote(
        selectedVersion.id,
        editNoteType,
        editNoteSummary || null
      );
      setEditNoteLoading(false);
      if (success) {
        setEditNoteDialogOpen(false);
      }
    }
  };

  const handleCompareClick = (version: PostVersion) => {
    setSelectedVersion(version);
    const currentIndex = versions.findIndex(v => v.id === version.id);
    const prevVersion = currentIndex < versions.length - 1 ? versions[currentIndex + 1] : null;
    setCompareVersion(prevVersion);
    setDiffDialogOpen(true);
  };

  const formatVersionDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy, h:mm a");
  };

  const VersionListItem = ({ version, isSelected, showBookmarkIcon = false }: { version: PostVersion; isSelected?: boolean; showBookmarkIcon?: boolean }) => {
    const isHovered = hoveredVersionId === version.id;
    const versionIsBookmarked = isBookmarked(version.id);
    
    return (
      <div
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
          isSelected 
            ? "bg-primary/10" 
            : "hover:bg-muted/50"
        }`}
        onMouseEnter={() => setHoveredVersionId(version.id)}
        onMouseLeave={() => setHoveredVersionId(null)}
        onClick={() => {
          setSelectedVersion(version);
          handleCompareClick(version);
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showBookmarkIcon && (
            <Bookmark className="h-4 w-4 text-foreground flex-shrink-0" fill="currentColor" />
          )}
          <div className="flex flex-col min-w-0">
            <span className={`text-sm truncate ${isSelected ? "text-primary font-medium" : "text-foreground"}`}>
              {version.change_summary || `Version ${version.version_number}`}
            </span>
            {version.versioning_note_type && (
              <span className="text-xs text-muted-foreground capitalize">
                {version.versioning_note_type.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {isHovered ? (
            <div className="flex items-center gap-1 bg-muted rounded-md px-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(version.id);
                }}
              >
                <Bookmark 
                  className={`h-3.5 w-3.5 ${versionIsBookmarked ? "text-primary" : ""}`} 
                  fill={versionIsBookmarked ? "currentColor" : "none"}
                />
              </Button>
              {!version.versioning_note_locked && onUpdateNote && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditNoteClick(version);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRevertClick(version);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatVersionDate(version.created_at)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            Version History
            {versions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {versions.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[480px] p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="flex items-center justify-between">
              History
              {id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/admin/posts/${id}/versions`)}
                  className="gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-100px)]">
            <div className="px-4 py-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="px-3 py-2.5 animate-pulse">
                      <div className="h-4 bg-muted rounded w-2/3 mb-1" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  ))}
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No versions saved yet</p>
                  <p className="text-sm mt-1">Versions are saved when you edit</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Bookmarked Section */}
                  {groupedVersions.bookmarked.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2 px-3">
                        Bookmarked
                      </h3>
                      <div className="space-y-0.5">
                        {groupedVersions.bookmarked.map((version) => (
                          <VersionListItem 
                            key={version.id} 
                            version={version}
                            isSelected={selectedVersion?.id === version.id}
                            showBookmarkIcon={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Published Section */}
                  {groupedVersions.published.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2 px-3">
                        Published
                      </h3>
                      <div className="space-y-0.5">
                        {groupedVersions.published.map((version) => (
                          <VersionListItem 
                            key={version.id} 
                            version={version}
                            isSelected={selectedVersion?.id === version.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unpublished Section */}
                  {groupedVersions.unpublished.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2 px-3">
                        Unpublished
                      </h3>
                      <div className="space-y-0.5">
                        {groupedVersions.unpublished.map((version) => (
                          <VersionListItem 
                            key={version.id} 
                            version={version}
                            isSelected={selectedVersion?.id === version.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Version {selectedVersion?.version_number}?</DialogTitle>
            <DialogDescription>
              This will update the live post content with this version and mark it as published.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPublish}>
              Publish This Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={diffDialogOpen} onOpenChange={setDiffDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Compare Versions
              {selectedVersion?.editor_role === "admin" && (
                <Badge className="bg-primary text-primary-foreground gap-1 ml-2">
                  <Shield className="h-3 w-3" />
                  Admin Edit
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Compare any two versions to see the differences
            </DialogDescription>
          </DialogHeader>
          
          {/* Version Selectors */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg flex-shrink-0">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Compare From (Older)
              </label>
              <Select
                value={compareVersion?.id || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setCompareVersion(null);
                  } else {
                    const version = versions.find(v => v.id === value);
                    setCompareVersion(version || null);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No comparison (show all)</SelectItem>
                  {versions
                    .filter(v => v.id !== selectedVersion?.id)
                    .map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        <div className="flex items-center gap-2">
                          <span>v{v.version_number}</span>
                          {v.editor_role === "admin" && (
                            <Shield className="h-3 w-3 text-primary" />
                          )}
                          {v.status === "published" && (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          )}
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(v.created_at), "MMM d")}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <ArrowLeftRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-5" />
            
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Compare To (Newer)
              </label>
              <Select
                value={selectedVersion?.id || ""}
                onValueChange={(value) => {
                  const version = versions.find(v => v.id === value);
                  setSelectedVersion(version || null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                {versions
                    .filter(v => v.id !== compareVersion?.id)
                    .map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        <div className="flex items-center gap-2">
                          <span>v{v.version_number}</span>
                          {v.editor_role === "admin" && (
                            <Shield className="h-3 w-3 text-primary" />
                          )}
                          {v.status === "published" && (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          )}
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(v.created_at), "MMM d")}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 overflow-hidden mt-2">
            <Tabs value={diffViewMode} onValueChange={(v) => setDiffViewMode(v as "inline" | "side-by-side")}>
              <TabsList className="grid w-full max-w-[300px] grid-cols-2">
                <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                <TabsTrigger value="inline">Inline Diff</TabsTrigger>
              </TabsList>
              
              <TabsContent value="side-by-side" className="mt-4">
                {selectedVersion && compareVersion ? (
                  <SideBySideComparison
                    oldVersion={compareVersion}
                    newVersion={selectedVersion}
                  />
                ) : selectedVersion ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Select a version to compare from the dropdown above</p>
                    <p className="text-sm mt-1">Or view all content without comparison</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select versions to compare
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="inline" className="mt-4">
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-green-200 dark:bg-green-800/50" />
                    <span>Added</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-red-200 dark:bg-red-800/50" />
                    <span>Removed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-amber-200 dark:bg-amber-800/50" />
                    <span>Modified</span>
                  </div>
                </div>

                {selectedVersion && (
                  <VersionDiffViewer
                    currentVersion={selectedVersion}
                    compareVersion={compareVersion}
                    currentContent={currentContent}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setDiffDialogOpen(false)}>
              Close
            </Button>
            {isAdmin && selectedVersion && (
              <Button onClick={() => {
                setDiffDialogOpen(false);
                handleRevertClick(selectedVersion);
              }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore Version {selectedVersion.version_number}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Dialog with Preview */}
      <Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Restore to Version {selectedVersion?.version_number}?
            </DialogTitle>
            <DialogDescription>
              This will replace your current editor content with the content from this version.
              Review the content below before confirming.
            </DialogDescription>
          </DialogHeader>
          
          {selectedVersion && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="flex items-center gap-3 mb-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">Version {selectedVersion.version_number}</span>
                    {selectedVersion.editor_role === "admin" ? (
                      <Badge className="bg-primary text-primary-foreground gap-1 text-xs">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <User className="h-3 w-3" />
                        Moderator
                      </Badge>
                    )}
                    {selectedVersion.status === "published" && (
                      <Badge className="bg-green-600 text-white text-xs">Published</Badge>
                    )}
                    {selectedVersion.status === "archived" && (
                      <Badge variant="outline" className="text-xs">Archived</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created on {format(new Date(selectedVersion.created_at), "MMMM d, yyyy 'at' h:mm a")} by{" "}
                    {selectedVersion.editor_profile?.full_name || selectedVersion.editor_profile?.email || "Unknown"}
                  </div>
                  {selectedVersion.change_summary && (
                    <div className="text-sm text-muted-foreground mt-1 italic">
                      "{selectedVersion.change_summary}"
                    </div>
                  )}
                </div>
              </div>

              {/* Content Preview styled like public post */}
              <div className="border rounded-2xl overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 shadow-lg">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center text-xs shadow">
                      🤖
                    </div>
                    <span className="text-sm font-medium">Content Preview</span>
                  </div>
                </div>
                <ScrollArea className="h-[280px]">
                  <div className="p-4">
                    {isChatTranscript(selectedVersion.content) ? (
                      <div className="space-y-4">
                        {extractChatSegments(selectedVersion.content, { allowSingle: true }).map((bubble: any, index: number) => {
                          const isMentor = bubble.speaker?.toLowerCase() === "karan";
                          return (
                            <div
                              key={index}
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
                                }`}
                              >
                                <div className={`text-[10px] font-semibold mb-1 tracking-wide uppercase ${
                                  isMentor ? "text-blue-100/80" : "text-primary"
                                }`}>
                                  {bubble.speaker || "Assistant"}
                                </div>
                                <div className="text-sm leading-relaxed">{bubble.content}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div 
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                      />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t bg-background">
            <Button variant="outline" onClick={() => setRevertDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleConfirmRevert} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Restore This Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Note Dialog */}
      <Dialog open={editNoteDialogOpen} onOpenChange={setEditNoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Version Note</DialogTitle>
            <DialogDescription>
              Update the note type and summary for this version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Note Type</Label>
              <Select
                value={editNoteType || ""}
                onValueChange={(value) => setEditNoteType(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a type..." />
                </SelectTrigger>
                <SelectContent>
                  {VERSIONING_OPTIONS.map((option) => (
                    <SelectItem key={option.type} value={option.type}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-change-summary">Change Summary</Label>
              <Textarea
                id="edit-change-summary"
                value={editNoteSummary}
                onChange={(e) => setEditNoteSummary(e.target.value)}
                placeholder="Describe what changed..."
                className="h-20 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditNoteDialogOpen(false)}
              disabled={editNoteLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmEditNote} disabled={editNoteLoading}>
              {editNoteLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VersionHistoryPanel;
