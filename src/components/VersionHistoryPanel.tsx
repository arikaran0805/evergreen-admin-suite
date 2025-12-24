import { useState } from "react";
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
import { History, RotateCcw, Upload, Eye, CheckCircle } from "lucide-react";

interface VersionHistoryPanelProps {
  versions: PostVersion[];
  loading: boolean;
  isAdmin: boolean;
  onRestore: (version: PostVersion) => void;
  onPublish: (version: PostVersion) => void;
  onPreview: (version: PostVersion) => void;
}

const VersionHistoryPanel = ({
  versions,
  loading,
  isAdmin,
  onRestore,
  onPublish,
  onPreview,
}: VersionHistoryPanelProps) => {
  const [selectedVersion, setSelectedVersion] = useState<PostVersion | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

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
            <SheetTitle>Version History</SheetTitle>
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
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={`p-4 border rounded-lg transition-colors hover:bg-muted/50 ${
                      version.is_published ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Version {version.version_number}
                        </span>
                        {version.is_published && (
                          <Badge className="bg-primary text-primary-foreground">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Published
                          </Badge>
                        )}
                        {index === 0 && !version.is_published && (
                          <Badge variant="secondary">Latest</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(version.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    
                    {version.change_summary && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {version.change_summary}
                      </p>
                    )}
                    
                    <div className="text-xs text-muted-foreground mb-3">
                      Edited by: {version.editor_profile?.full_name || version.editor_profile?.email || "Unknown"}
                    </div>
                    
                    <div className="flex gap-2">
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
                        onClick={() => onRestore(version)}
                        className="gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
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
                ))}
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
    </>
  );
};

export default VersionHistoryPanel;
