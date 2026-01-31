import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Trash2,
  FileText,
  ExternalLink,
  Link2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useProblemMappingsBySubTopic,
  useAllGlobalProblems,
  useCreateProblemMapping,
  useDeleteProblemMapping,
} from "@/hooks/useProblemMappings";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ProblemMappingManagerProps {
  subTopicId: string;
  subTopicTitle: string;
  onClose: () => void;
  onCreateNewProblem?: () => void;
}

export function ProblemMappingManager({
  subTopicId,
  subTopicTitle,
  onClose,
  onCreateNewProblem,
}: ProblemMappingManagerProps) {
  const { data: mappings, isLoading: mappingsLoading } = useProblemMappingsBySubTopic(subTopicId);
  const { data: allProblems, isLoading: problemsLoading } = useAllGlobalProblems();
  const createMapping = useCreateProblemMapping();
  const deleteMapping = useDeleteProblemMapping();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [contextNote, setContextNote] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; problemId: string; title: string } | null>(null);

  // Problems not yet attached to this sub-topic
  const attachedProblemIds = useMemo(
    () => new Set((mappings || []).map((m) => m.problem_id)),
    [mappings]
  );

  const availableProblems = useMemo(() => {
    if (!allProblems) return [];
    return allProblems
      .filter((p) => !attachedProblemIds.has(p.id))
      .filter((p) =>
        searchQuery
          ? p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sub_topic?.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      );
  }, [allProblems, attachedProblemIds, searchQuery]);

  const handleAttach = async () => {
    if (!selectedProblemId) return;
    await createMapping.mutateAsync({
      problem_id: selectedProblemId,
      sub_topic_id: subTopicId,
      display_order: (mappings?.length || 0) + 1,
      context_note: contextNote.trim() || undefined,
    });
    setSelectedProblemId(null);
    setContextNote("");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMapping.mutateAsync({
      id: deleteTarget.id,
      subTopicId,
      problemId: deleteTarget.problemId,
    });
    setDeleteTarget(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-600 bg-green-500/10 border-green-500/30";
      case "Medium":
        return "text-yellow-600 bg-yellow-500/10 border-yellow-500/30";
      case "Hard":
        return "text-red-600 bg-red-500/10 border-red-500/30";
      default:
        return "";
    }
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Manage Problems: {subTopicTitle}
            </DialogTitle>
            <DialogDescription>
              Attach existing problems or create new ones for this sub-topic.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex gap-4">
            {/* Left: Attached Problems */}
            <div className="flex-1 flex flex-col min-w-0">
              <h4 className="font-medium text-sm mb-2">
                Attached Problems ({mappings?.length || 0})
              </h4>
              <ScrollArea className="flex-1 border rounded-lg">
                {mappingsLoading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : mappings && mappings.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {mappings.map((m, idx) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50"
                      >
                        <span className="text-xs text-muted-foreground w-5">
                          {idx + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {m.problem?.title || "Unknown"}
                          </p>
                          {m.context_note && (
                            <p className="text-xs text-muted-foreground truncate">
                              {m.context_note}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-xs shrink-0", getDifficultyColor(m.problem?.difficulty || ""))}
                        >
                          {m.problem?.difficulty}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                          onClick={() =>
                            setDeleteTarget({
                              id: m.id,
                              problemId: m.problem_id,
                              title: m.problem?.title || "Unknown",
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No problems attached yet.</p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Right: Available Problems to Attach */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-sm">Attach Existing Problem</h4>
                {onCreateNewProblem && (
                  <Button size="sm" variant="outline" className="ml-auto" onClick={onCreateNewProblem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create New
                  </Button>
                )}
              </div>

              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search problems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                {problemsLoading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : availableProblems.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {availableProblems.slice(0, 50).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProblemId(p.id)}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                          selectedProblemId === p.id
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{p.title}</p>
                          {p.sub_topic && (
                            <p className="text-xs text-muted-foreground truncate">
                              {p.sub_topic}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-xs shrink-0", getDifficultyColor(p.difficulty))}
                        >
                          {p.difficulty}
                        </Badge>
                      </button>
                    ))}
                    {availableProblems.length > 50 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Showing first 50 results. Refine your search.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="text-sm">
                      {searchQuery
                        ? "No matching problems found."
                        : "All problems are already attached."}
                    </p>
                  </div>
                )}
              </ScrollArea>

              {/* Context Note Input */}
              {selectedProblemId && (
                <div className="mt-2 space-y-2 p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs font-medium">
                    Context Note (optional)
                  </p>
                  <Textarea
                    placeholder="Add course-specific context for this problem..."
                    value={contextNote}
                    onChange={(e) => setContextNote(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleAttach}
                    disabled={createMapping.isPending}
                    className="w-full"
                  >
                    {createMapping.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Attaching...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-1" />
                        Attach Problem
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Detach Problem?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{deleteTarget?.title}" from this sub-topic? The problem itself
              will not be deleted and can be re-attached later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Detach
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
