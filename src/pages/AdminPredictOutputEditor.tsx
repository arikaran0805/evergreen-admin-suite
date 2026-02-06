import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Save, Loader2, Plus, X, Check, AlertCircle,
  Settings, FileText, Lightbulb, Eye, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  usePredictOutputProblem,
  useCreatePredictOutputProblem,
  useUpdatePredictOutputProblem,
  useDeletePredictOutputProblem,
} from "@/hooks/usePredictOutputProblems";
import { usePracticeSkill } from "@/hooks/usePracticeSkills";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import PredictOutputLearnerPreview from "@/components/predict-output/PredictOutputLearnerPreview";

const LANGUAGES = ["python", "javascript", "java", "sql", "c", "cpp", "r", "csharp", "typescript"];
const SUGGESTED_TAGS = ["loops", "scope", "strings", "nulls", "joins", "recursion", "operators", "type-coercion", "closures", "hoisting", "list-comprehension", "slicing", "mutability", "references"];

const formSchema = z.object({
  title: z.string().min(1, "Title required").max(60, "Max 60 characters"),
  slug: z.string().min(1, "Slug required").regex(/^[a-z0-9-]+$/, "Lowercase with hyphens"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  language: z.string().min(1, "Language required"),
  prompt: z.string().max(160, "Max 160 characters").optional().or(z.literal("")),
  code: z.string().min(1, "Code is required"),
  expected_output: z.string().min(1, "Expected output is required"),
  status: z.enum(["draft", "published"]).default("draft"),
});

type FormData = z.infer<typeof formSchema>;
type TabId = "content" | "explanation" | "settings";

export default function AdminPredictOutputEditor() {
  const { skillId, problemId } = useParams<{ skillId: string; problemId: string }>();
  const navigate = useNavigate();
  const isEditing = !!problemId && problemId !== "new";
  const { isAdmin } = useUserRole();

  const { data: skill } = usePracticeSkill(skillId);
  const { data: problem, isLoading } = usePredictOutputProblem(isEditing ? problemId : undefined);
  const createMutation = useCreatePredictOutputProblem();
  const updateMutation = useUpdatePredictOutputProblem();
  const deleteMutation = useDeletePredictOutputProblem();

  const [activeTab, setActiveTab] = useState<TabId>("content");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [acceptedOutputs, setAcceptedOutputs] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [stepByStep, setStepByStep] = useState<string[]>([]);
  const [commonMistakes, setCommonMistakes] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [matchMode, setMatchMode] = useState<string>("strict");
  const [outputType, setOutputType] = useState<string>("single_line");
  const [revealAllowed, setRevealAllowed] = useState(true);
  const [revealTiming, setRevealTiming] = useState("anytime");
  const [revealPenalty, setRevealPenalty] = useState("no_xp");
  const [xpValue, setXpValue] = useState(10);
  const [streakEligible, setStreakEligible] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "", slug: "", difficulty: "Easy", language: "python",
      prompt: "", code: "", expected_output: "", status: "draft",
    },
  });

  useEffect(() => {
    if (problem) {
      form.reset({
        title: problem.title, slug: problem.slug, difficulty: problem.difficulty,
        language: problem.language, prompt: problem.prompt || "",
        code: problem.code, expected_output: problem.expected_output,
        status: problem.status as "draft" | "published",
      });
      setTags(problem.tags);
      setAcceptedOutputs(problem.accepted_outputs);
      setHints(problem.hints);
      setStepByStep(problem.step_by_step);
      setCommonMistakes(problem.common_mistakes);
      setExplanation(problem.explanation || "");
      setMatchMode(problem.match_mode);
      setOutputType(problem.output_type);
      setRevealAllowed(problem.reveal_allowed);
      setRevealTiming(problem.reveal_timing);
      setRevealPenalty(problem.reveal_penalty);
      setXpValue(problem.xp_value);
      setStreakEligible(problem.streak_eligible);
    }
  }, [problem, form]);

  const handleTitleChange = (title: string) => {
    form.setValue("title", title);
    if (!isEditing) {
      form.setValue("slug", title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-"));
    }
  };

  // Validation: can publish?
  const canPublish = useMemo(() => {
    const vals = form.getValues();
    return !!vals.code?.trim() && !!vals.expected_output?.trim() && !!explanation?.trim();
  }, [form.watch("code"), form.watch("expected_output"), explanation]);

  const onSubmit = async (data: FormData) => {
    if (data.status === "published" && !canPublish) return;

    const payload = {
      ...data,
      skill_id: skillId!,
      tags, accepted_outputs: acceptedOutputs, hints, step_by_step: stepByStep,
      common_mistakes: commonMistakes, explanation, match_mode: matchMode as any,
      output_type: outputType as any, reveal_allowed: revealAllowed,
      reveal_timing: revealTiming as any, reveal_penalty: revealPenalty as any,
      xp_value: xpValue, streak_eligible: streakEligible, is_premium: false, display_order: 0,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: problemId, ...payload });
    } else {
      await createMutation.mutateAsync(payload as any);
    }
    navigate(`/admin/practice/skills/${skillId}/problems`);
  };

  const handleDelete = async () => {
    if (!problemId || !skillId) return;
    await deleteMutation.mutateAsync({ id: problemId, skillId });
    navigate(`/admin/practice/skills/${skillId}/problems`);
  };

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  if (isEditing && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card><CardContent className="p-6 space-y-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent></Card>
      </div>
    );
  }

  // Preview data for live learner preview
  const previewData = {
    title: form.watch("title") || "Untitled Problem",
    difficulty: form.watch("difficulty"),
    language: form.watch("language"),
    tags,
    prompt: form.watch("prompt") || "",
    code: form.watch("code") || "",
    expected_output: form.watch("expected_output") || "",
  };

  return (
    <div className="space-y-4">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border -mx-6 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/practice/skills/${skillId}/problems`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">{isEditing ? "Edit" : "Create"} Predict Output</h1>
              <p className="text-xs text-muted-foreground">{skill?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={form.watch("status") === "published" ? "default" : "secondary"}>
              {form.watch("status")}
            </Badge>
            {isEditing && isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Problem</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this problem and all attempts.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={form.handleSubmit((d) => onSubmit({ ...d, status: "draft" }))}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={form.handleSubmit((d) => onSubmit({ ...d, status: "published" }))}
              disabled={!canPublish || createMutation.isPending || updateMutation.isPending}
            >
              Publish
            </Button>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-160px)] rounded-lg border border-border">
            {/* Left: Editor Tabs */}
            <ResizablePanel defaultSize={55} minSize={35}>
              <div className="h-full overflow-auto">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="h-full flex flex-col">
                  <div className="border-b border-border px-4 pt-3">
                    <TabsList className="bg-muted/60">
                      <TabsTrigger value="content" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Content</TabsTrigger>
                      <TabsTrigger value="explanation" className="gap-1.5 text-xs"><Lightbulb className="h-3.5 w-3.5" />Explanation</TabsTrigger>
                      <TabsTrigger value="settings" className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" />Settings</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-auto p-4 space-y-6">
                    {/* TAB: Content */}
                    <TabsContent value="content" className="mt-0 space-y-5">
                      <ContentTab
                        form={form}
                        tags={tags}
                        tagInput={tagInput}
                        setTagInput={setTagInput}
                        addTag={addTag}
                        setTags={setTags}
                        acceptedOutputs={acceptedOutputs}
                        setAcceptedOutputs={setAcceptedOutputs}
                        handleTitleChange={handleTitleChange}
                        isEditing={isEditing}
                      />
                    </TabsContent>

                    {/* TAB: Explanation */}
                    <TabsContent value="explanation" className="mt-0 space-y-5">
                      <ExplanationTab
                        explanation={explanation}
                        setExplanation={setExplanation}
                        stepByStep={stepByStep}
                        setStepByStep={setStepByStep}
                        commonMistakes={commonMistakes}
                        setCommonMistakes={setCommonMistakes}
                        hints={hints}
                        setHints={setHints}
                      />
                    </TabsContent>

                    {/* TAB: Settings */}
                    <TabsContent value="settings" className="mt-0 space-y-5">
                      <SettingsTab
                        matchMode={matchMode} setMatchMode={setMatchMode}
                        outputType={outputType} setOutputType={setOutputType}
                        revealAllowed={revealAllowed} setRevealAllowed={setRevealAllowed}
                        revealTiming={revealTiming} setRevealTiming={setRevealTiming}
                        revealPenalty={revealPenalty} setRevealPenalty={setRevealPenalty}
                        xpValue={xpValue} setXpValue={setXpValue}
                        streakEligible={streakEligible} setStreakEligible={setStreakEligible}
                        form={form}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right: Live Preview */}
            <ResizablePanel defaultSize={45} minSize={30}>
              <div className="h-full overflow-auto bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Learner Preview</span>
                </div>
                <PredictOutputLearnerPreview {...previewData} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </form>
      </Form>
    </div>
  );
}

// ─── Content Tab ──────────────────────────────────────
function ContentTab({ form, tags, tagInput, setTagInput, addTag, setTags, acceptedOutputs, setAcceptedOutputs, handleTitleChange, isEditing }: any) {
  return (
    <>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel>Title</FormLabel><FormControl>
              <Input placeholder="What does this code print?" {...field} onChange={e => handleTitleChange(e.target.value)} maxLength={60} />
            </FormControl><FormDescription>{field.value?.length || 0}/60</FormDescription><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="slug" render={({ field }) => (
            <FormItem><FormLabel>Slug</FormLabel><FormControl>
              <Input placeholder="what-does-this-print" {...field} disabled={isEditing} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="difficulty" render={({ field }) => (
              <FormItem><FormLabel>Difficulty</FormLabel><Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="language" render={({ field }) => (
              <FormItem><FormLabel>Language</FormLabel><Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {LANGUAGES.map(l => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
                </SelectContent>
              </Select><FormMessage /></FormItem>
            )} />
          </div>
          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <Badge key={t} variant="secondary" className="gap-1 text-xs">
                  {t}<button type="button" onClick={() => setTags(tags.filter((x: string) => x !== t))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add tag..." className="flex-1"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); }}} />
              <Button type="button" size="sm" variant="outline" onClick={() => addTag(tagInput)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {SUGGESTED_TAGS.filter(t => !tags.includes(t)).slice(0, 8).map(t => (
                <button key={t} type="button" onClick={() => addTag(t)} className="text-[10px] px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground">{t}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Code & Prompt</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FormField control={form.control} name="prompt" render={({ field }) => (
            <FormItem><FormLabel>Short Prompt</FormLabel><FormControl>
              <Input placeholder="What is the output of the following code?" {...field} maxLength={160} />
            </FormControl><FormDescription>{field.value?.length || 0}/160</FormDescription><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="code" render={({ field }) => (
            <FormItem><FormLabel>Code Snippet <span className="text-destructive">*</span></FormLabel><FormControl>
              <Textarea placeholder="x = [1, 2, 3]&#10;print(x[::-1])" className="font-mono text-sm min-h-[180px]" {...field} />
            </FormControl><FormMessage /></FormItem>
          )} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Expected Output</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FormField control={form.control} name="expected_output" render={({ field }) => (
            <FormItem><FormLabel>Expected Output <span className="text-destructive">*</span></FormLabel><FormControl>
              <Textarea placeholder="[3, 2, 1]" className="font-mono text-sm min-h-[100px]" {...field} />
            </FormControl>
              <FormDescription>
                {field.value?.split("\n").length || 0} line(s) · {field.value?.length || 0} char(s)
              </FormDescription>
            <FormMessage /></FormItem>
          )} />
          {/* Accepted Outputs */}
          <div className="space-y-2">
            <Label>Accepted Outputs (alternatives)</Label>
            {acceptedOutputs.map((o: string, i: number) => (
              <div key={i} className="flex gap-2">
                <Textarea className="font-mono text-sm min-h-[60px] flex-1" value={o}
                  onChange={e => { const u = [...acceptedOutputs]; u[i] = e.target.value; setAcceptedOutputs(u); }} />
                <Button type="button" variant="ghost" size="icon" onClick={() => setAcceptedOutputs(acceptedOutputs.filter((_: any, j: number) => j !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setAcceptedOutputs([...acceptedOutputs, ""])}>
              <Plus className="h-4 w-4 mr-1" />Add Alternative
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Explanation Tab ──────────────────────────────────
function ExplanationTab({ explanation, setExplanation, stepByStep, setStepByStep, commonMistakes, setCommonMistakes, hints, setHints }: any) {
  return (
    <>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Explanation <span className="text-destructive">*</span></CardTitle>
          <CardDescription>Required before publishing</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea value={explanation} onChange={e => setExplanation(e.target.value)}
            placeholder="Explain why the output is what it is..." className="min-h-[150px]" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Step-by-Step Reasoning</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {stepByStep.map((s: string, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-xs text-muted-foreground mt-2.5 w-5 shrink-0">{i + 1}.</span>
              <Input value={s} onChange={e => { const u = [...stepByStep]; u[i] = e.target.value; setStepByStep(u); }} placeholder={`Step ${i + 1}`} />
              <Button type="button" variant="ghost" size="icon" onClick={() => setStepByStep(stepByStep.filter((_: any, j: number) => j !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setStepByStep([...stepByStep, ""])}>
            <Plus className="h-4 w-4 mr-1" />Add Step
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Common Mistakes</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {commonMistakes.map((s: string, i: number) => (
            <div key={i} className="flex gap-2">
              <Input value={s} onChange={e => { const u = [...commonMistakes]; u[i] = e.target.value; setCommonMistakes(u); }} placeholder={`Mistake ${i + 1}`} />
              <Button type="button" variant="ghost" size="icon" onClick={() => setCommonMistakes(commonMistakes.filter((_: any, j: number) => j !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setCommonMistakes([...commonMistakes, ""])}>
            <Plus className="h-4 w-4 mr-1" />Add Mistake
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Hints (progressive)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {hints.map((s: string, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-xs text-muted-foreground mt-2.5 w-5 shrink-0">💡</span>
              <Input value={s} onChange={e => { const u = [...hints]; u[i] = e.target.value; setHints(u); }} placeholder={`Hint ${i + 1}`} />
              <Button type="button" variant="ghost" size="icon" onClick={() => setHints(hints.filter((_: any, j: number) => j !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setHints([...hints, ""])}>
            <Plus className="h-4 w-4 mr-1" />Add Hint
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Settings Tab ──────────────────────────────────
function SettingsTab({ matchMode, setMatchMode, outputType, setOutputType, revealAllowed, setRevealAllowed, revealTiming, setRevealTiming, revealPenalty, setRevealPenalty, xpValue, setXpValue, streakEligible, setStreakEligible, form }: any) {
  return (
    <>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Matching Mode</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Match Mode</Label>
            <Select value={matchMode} onValueChange={setMatchMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">Strict (exact match)</SelectItem>
                <SelectItem value="trim">Trim-tolerant (ignore leading/trailing spaces)</SelectItem>
                <SelectItem value="normalized">Normalized (collapse spaces, ignore blank lines)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Output Type</Label>
            <Select value={outputType} onValueChange={setOutputType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single_line">Single line</SelectItem>
                <SelectItem value="multi_line">Multi-line</SelectItem>
                <SelectItem value="json">JSON (compare after parse)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Reveal Rules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Reveal Allowed</Label>
              <p className="text-xs text-muted-foreground">Allow learners to reveal the answer</p>
            </div>
            <Switch checked={revealAllowed} onCheckedChange={setRevealAllowed} />
          </div>
          {revealAllowed && (
            <>
              <div className="space-y-2">
                <Label>Reveal Timing</Label>
                <Select value={revealTiming} onValueChange={setRevealTiming}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anytime">Anytime</SelectItem>
                    <SelectItem value="after_1">After 1 attempt</SelectItem>
                    <SelectItem value="after_2">After 2 attempts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reveal Penalty</Label>
                <Select value={revealPenalty} onValueChange={setRevealPenalty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_xp">No XP</SelectItem>
                    <SelectItem value="half_xp">-50% XP</SelectItem>
                    <SelectItem value="viewed_solution">Mark as "Viewed solution"</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Scoring</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>XP Value</Label>
            <Input type="number" min={0} max={100} value={xpValue} onChange={e => setXpValue(Number(e.target.value))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Streak Eligible</Label>
              <p className="text-xs text-muted-foreground">Counts towards daily streak</p>
            </div>
            <Switch checked={streakEligible} onCheckedChange={setStreakEligible} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
