import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, GripVertical, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SubTopic, useCreateSubTopic, useDeleteSubTopic, useUpdateSubTopic } from "@/hooks/useSubTopics";
import { PracticeProblem } from "@/hooks/usePracticeProblems";
import { cn } from "@/lib/utils";

interface LessonProblemsSectionProps {
  lesson: {
    id: string;
    title: string;
    course_id: string;
  };
  skillId: string;
  subTopics: SubTopic[];
  problemsBySubTopic: Record<string, PracticeProblem[]>;
  onProblemClick: (problemId: string) => void;
  onAddProblem: (subTopicId: string) => void;
}

export function LessonProblemsSection({
  lesson,
  skillId,
  subTopics,
  problemsBySubTopic,
  onProblemClick,
  onAddProblem,
}: LessonProblemsSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSubTopicTitle, setNewSubTopicTitle] = useState("");
  const [deleteSubTopicId, setDeleteSubTopicId] = useState<string | null>(null);
  const [renameSubTopic, setRenameSubTopic] = useState<SubTopic | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const createSubTopic = useCreateSubTopic();
  const deleteSubTopic = useDeleteSubTopic();
  const updateSubTopic = useUpdateSubTopic();

  const totalProblems = subTopics.reduce((sum, st) => sum + (problemsBySubTopic[st.id]?.length || 0), 0);

  const handleCreateSubTopic = async () => {
    if (!newSubTopicTitle.trim()) return;
    
    await createSubTopic.mutateAsync({
      lesson_id: lesson.id,
      skill_id: skillId,
      title: newSubTopicTitle.trim(),
      display_order: subTopics.length,
    });
    
    setNewSubTopicTitle("");
    setShowCreateDialog(false);
  };

  const handleDeleteSubTopic = async (subTopicId: string) => {
    await deleteSubTopic.mutateAsync({
      id: subTopicId,
      lessonId: lesson.id,
      skillId,
    });
    setDeleteSubTopicId(null);
  };

  const handleRenameSubTopic = async () => {
    if (!renameSubTopic || !renameTitle.trim()) return;
    
    await updateSubTopic.mutateAsync({
      id: renameSubTopic.id,
      title: renameTitle.trim(),
    });
    
    setRenameSubTopic(null);
    setRenameTitle("");
  };

  const openRenameDialog = (subTopic: SubTopic) => {
    setRenameSubTopic(subTopic);
    setRenameTitle(subTopic.title);
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">Easy</Badge>;
      case "Medium":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs">Medium</Badge>;
      case "Hard":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs">Hard</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{difficulty}</Badge>;
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {/* Lesson Header */}
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{lesson.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {totalProblems} problems
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateDialog(true);
                }}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Sub-Topic
              </Button>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="divide-y divide-border">
              {subTopics.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  <p className="text-sm">No sub-topics yet.</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowCreateDialog(true)}
                    className="mt-1"
                  >
                    Create your first sub-topic
                  </Button>
                </div>
              ) : (
                subTopics.map((subTopic) => (
                  <SubTopicSection
                    key={subTopic.id}
                    subTopic={subTopic}
                    problems={problemsBySubTopic[subTopic.id] || []}
                    onProblemClick={onProblemClick}
                    onAddProblem={() => onAddProblem(subTopic.id)}
                    onRename={() => openRenameDialog(subTopic)}
                    onDelete={() => setDeleteSubTopicId(subTopic.id)}
                    getDifficultyBadge={getDifficultyBadge}
                  />
                ))
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Create Sub-Topic Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sub-Topic</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Sub-topic title..."
              value={newSubTopicTitle}
              onChange={(e) => setNewSubTopicTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSubTopic()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubTopic} disabled={!newSubTopicTitle.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteSubTopicId} onOpenChange={() => setDeleteSubTopicId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sub-Topic</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the sub-topic and all problem mappings. The problems themselves won't be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSubTopicId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteSubTopicId && handleDeleteSubTopic(deleteSubTopicId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Sub-Topic Dialog */}
      <Dialog open={!!renameSubTopic} onOpenChange={() => setRenameSubTopic(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Sub-Topic</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Sub-topic title..."
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameSubTopic()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameSubTopic(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubTopic} disabled={!renameTitle.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface SubTopicSectionProps {
  subTopic: SubTopic;
  problems: PracticeProblem[];
  onProblemClick: (problemId: string) => void;
  onAddProblem: () => void;
  onRename: () => void;
  onDelete: () => void;
  getDifficultyBadge: (difficulty: string) => React.ReactNode;
}

function SubTopicSection({
  subTopic,
  problems,
  onProblemClick,
  onAddProblem,
  onRename,
  onDelete,
  getDifficultyBadge,
}: SubTopicSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-background">
      {/* Sub-Topic Header */}
      <div 
        className="flex items-center justify-between px-4 py-2.5 pl-10 bg-muted/20 cursor-pointer hover:bg-muted/30"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{subTopic.title}</span>
          {subTopic.is_default && (
            <Badge variant="outline" className="text-xs">Default</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            ({problems.length} problems)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddProblem();
            }}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add Problem
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Sub-Topic
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Problems List */}
      {isExpanded && (
        <div className="divide-y divide-border/50">
          {problems.length === 0 ? (
            <div className="px-4 py-4 pl-14 text-sm text-muted-foreground">
              No problems mapped yet.
            </div>
          ) : (
            problems.map((problem) => (
              <div
                key={problem.id}
                className="flex items-center gap-3 px-4 py-2.5 pl-14 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onProblemClick(problem.id)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                <span className="flex-1 text-sm">{problem.title}</span>
                {getDifficultyBadge(problem.difficulty)}
                <Badge variant={problem.status === "published" ? "default" : "secondary"} className="text-xs">
                  {problem.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
