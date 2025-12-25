import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { PostVersion } from "@/hooks/usePostVersions";
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
import { History, RotateCcw, Upload, Eye, CheckCircle, GitCompare, Shield, User, AlertTriangle, ArrowLeftRight, ExternalLink } from "lucide-react";
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
}

const VersionHistoryPanel = ({
  versions,
  loading,
  isAdmin,
  currentContent,
  onRestore,
  onPublish,
  onPreview,
}: VersionHistoryPanelProps) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [selectedVersion, setSelectedVersion] = useState<PostVersion | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [compareVersion, setCompareVersion] = useState<PostVersion | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<"inline" | "side-by-side">("side-by-side");

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

  const handleCompareClick = (version: PostVersion) => {
    setSelectedVersion(version);
    const currentIndex = versions.findIndex(v => v.id === version.id);
    const prevVersion = currentIndex < versions.length - 1 ? versions[currentIndex + 1] : null;
    setCompareVersion(prevVersion);
    setDiffDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge className="bg-primary text-primary-foreground gap-1 text-xs">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <User className="h-3 w-3" />
        Moderator
      </Badge>
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
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              Version History
              {id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/admin/posts/${id}/versions`)}
                  className="gap-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  Full View
                </Button>
              )}
            </SheetTitle>
            <SheetDescription>
              View and manage all saved versions of this post
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-150px)] mt-4 pr-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No versions saved yet</p>
                <p className="text-sm">Versions are saved automatically when you edit</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version, index) => {
                  const isInitialVersion = version.version_number === 0;
                  const isDraft = !version.is_published && !isInitialVersion;
                  
                  return (
                    <div
                      key={version.id}
                      className={`p-4 border rounded-lg transition-colors hover:bg-muted/50 ${
                        version.is_published ? "border-primary bg-primary/5" : ""
                      } ${version.editor_role === "admin" ? "border-l-4 border-l-primary" : ""}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base">
                            v{version.version_number}
                          </span>
                          {getRoleBadge(version.editor_role)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(version.created_at), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      
                      {/* Status badges */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {version.is_published && (
                          <Badge className="bg-green-600 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Published
                          </Badge>
                        )}
                        {isInitialVersion && (
                          <Badge variant="outline" className="border-blue-500 text-blue-600">
                            Initial Version
                          </Badge>
                        )}
                        {isDraft && (
                          <Badge variant="secondary">
                            Draft
                          </Badge>
                        )}
                        {index === 0 && !version.is_published && (
                          <Badge variant="outline">Latest</Badge>
                        )}
                      </div>
                      
                      {version.change_summary && (
                        <p className="text-sm text-muted-foreground mb-2 italic">
                          "{version.change_summary}"
                        </p>
                      )}
                      
                      <div className="text-xs text-muted-foreground mb-3">
                        Edited by: {version.editor_profile?.full_name || version.editor_profile?.email || "Unknown"}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCompareClick(version)}
                          className="gap-1"
                        >
                          <GitCompare className="h-3 w-3" />
                          Compare
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPreview(version)}
                          className="gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevertClick(version)}
                          className="gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore
                        </Button>
                        {id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/posts/${id}/versions`)}
                            className="gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Full View
                          </Button>
                        )}
                        {isAdmin && !version.is_published && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePublishClick(version)}
                            className="gap-1"
                          >
                            <Upload className="h-3 w-3" />
                            Publish
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                          {v.is_published && (
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
                          {v.is_published && (
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
                    {selectedVersion.is_published && (
                      <Badge className="bg-green-600 text-white text-xs">Published</Badge>
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
    </>
  );
};

export default VersionHistoryPanel;
