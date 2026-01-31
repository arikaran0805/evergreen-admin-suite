import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePracticeSkill } from "@/hooks/usePracticeSkills";
import {
  usePracticeProblem,
  useCreatePracticeProblem,
  useUpdatePracticeProblem,
} from "@/hooks/usePracticeProblems";
import {
  TestCasesSection,
  IOFormatSection,
  LimitsSection,
  SupportedLanguagesSection,
  FunctionSignatureSection,
  ProblemTagsSection,
  ProblemPreviewDialog,
  type TestCase,
  type SupportedLanguage,
  type FunctionSignature,
} from "@/components/admin/problem-editor";
import { useUserRole } from "@/hooks/useUserRole";

const problemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  sub_topic: z.string().min(1, "Sub-topic is required"),
  description: z.string().optional(),
  is_premium: z.boolean().default(false),
  display_order: z.coerce.number().default(0),
  status: z.enum(["draft", "published"]).default("draft"),
  solution: z.string().optional(),
});

type ProblemFormData = z.infer<typeof problemSchema>;

export default function AdminProblemEditor() {
  const { skillId, problemId } = useParams<{ skillId: string; problemId: string }>();
  const navigate = useNavigate();
  const isEditing = !!problemId && problemId !== "new";
  const { isAdmin, isSuperModerator, isSeniorModerator, isModerator } = useUserRole();

  const { data: skill } = usePracticeSkill(skillId);
  const { data: problem, isLoading } = usePracticeProblem(isEditing ? problemId : undefined);
  const createMutation = useCreatePracticeProblem();
  const updateMutation = useUpdatePracticeProblem();

  const [examples, setExamples] = useState<{ input: string; output: string; explanation?: string }[]>([]);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [starterCode, setStarterCode] = useState<Record<string, string>>({
    python: "",
    javascript: "",
    sql: "",
    java: "",
    cpp: "",
  });

  // New LeetCode-critical fields
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [timeLimit, setTimeLimit] = useState(1000);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [selectedLanguages, setSelectedLanguages] = useState<SupportedLanguage[]>(["python", "javascript"]);
  const [functionSignature, setFunctionSignature] = useState<FunctionSignature>({
    name: "solution",
    parameters: [],
    return_type: "int",
  });
  const [tags, setTags] = useState<string[]>([]);

  // Role-based permissions
  const canEditTestCases = isAdmin;
  const canEditLimits = isAdmin || isSuperModerator;
  const canEditAll = isAdmin || isSuperModerator || isSeniorModerator;
  const isViewOnly = isModerator && !isSeniorModerator && !isSuperModerator && !isAdmin;

  const form = useForm<ProblemFormData>({
    resolver: zodResolver(problemSchema),
    defaultValues: {
      title: "",
      slug: "",
      difficulty: "Easy",
      sub_topic: "",
      description: "",
      is_premium: false,
      display_order: 0,
      status: "draft",
      solution: "",
    },
  });

  useEffect(() => {
    if (problem) {
      form.reset({
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty,
        sub_topic: problem.sub_topic,
        description: problem.description || "",
        is_premium: problem.is_premium,
        display_order: problem.display_order,
        status: problem.status as "draft" | "published",
        solution: problem.solution || "",
      });
      setExamples(problem.examples || []);
      setConstraints(problem.constraints || []);
      setHints(problem.hints || []);
      setStarterCode(problem.starter_code || { python: "", javascript: "", sql: "" });
    }
  }, [problem, form]);

  const onSubmit = async (data: ProblemFormData) => {
    if (isEditing) {
      await updateMutation.mutateAsync({
        id: problemId,
        title: data.title,
        slug: data.slug,
        difficulty: data.difficulty,
        sub_topic: data.sub_topic,
        description: data.description,
        is_premium: data.is_premium,
        display_order: data.display_order,
        status: data.status,
        solution: data.solution,
        examples,
        constraints,
        hints,
        starter_code: starterCode,
      });
    } else {
      await createMutation.mutateAsync({
        skill_id: skillId,
        title: data.title,
        slug: data.slug,
        difficulty: data.difficulty,
        sub_topic: data.sub_topic,
        description: data.description,
        is_premium: data.is_premium,
        display_order: data.display_order,
        status: data.status,
        solution: data.solution,
        examples,
        constraints,
        hints,
        starter_code: starterCode,
      });
    }
    navigate(`/admin/practice/skills/${skillId}/problems`);
  };

  const handleTitleChange = (title: string) => {
    form.setValue("title", title);
    if (!isEditing) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
      form.setValue("slug", slug);
    }
  };

  const addExample = () => setExamples([...examples, { input: "", output: "", explanation: "" }]);
  const removeExample = (index: number) => setExamples(examples.filter((_, i) => i !== index));
  const updateExample = (index: number, field: string, value: string) => {
    const updated = [...examples];
    updated[index] = { ...updated[index], [field]: value };
    setExamples(updated);
  };

  const addConstraint = () => setConstraints([...constraints, ""]);
  const removeConstraint = (index: number) => setConstraints(constraints.filter((_, i) => i !== index));
  const updateConstraint = (index: number, value: string) => {
    const updated = [...constraints];
    updated[index] = value;
    setConstraints(updated);
  };

  const addHint = () => setHints([...hints, ""]);
  const removeHint = (index: number) => setHints(hints.filter((_, i) => i !== index));
  const updateHint = (index: number, value: string) => {
    const updated = [...hints];
    updated[index] = value;
    setHints(updated);
  };

  if (isEditing && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const hiddenTestCasesCount = testCases.filter((tc) => !tc.is_visible).length;
  const canPublish = hiddenTestCasesCount >= 1 && selectedLanguages.length >= 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/practice/skills/${skillId}/problems`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Problem" : "Create Problem"}
            </h1>
            <p className="text-muted-foreground">
              {skill?.name} &gt; {isEditing ? "Edit" : "New Problem"}
            </p>
          </div>
        </div>
        <ProblemPreviewDialog
          title={form.watch("title")}
          difficulty={form.watch("difficulty")}
          description={form.watch("description") || ""}
          inputFormat={inputFormat}
          outputFormat={outputFormat}
          examples={examples}
          constraints={constraints}
          hints={hints}
          tags={tags}
          testCases={testCases}
          starterCode={starterCode}
          selectedLanguages={selectedLanguages}
          timeLimit={timeLimit}
          memoryLimit={memoryLimit}
        />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="e.g., Two Sum"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., two-sum" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sub_topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-Topic</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Arrays, Sorting" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="display_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_premium"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Premium Problem</FormLabel>
                      <FormDescription>Only accessible to premium users</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Problem Description</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Markdown supported)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Describe the problem..." rows={8} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Input/Output Format - NEW */}
          <IOFormatSection
            inputFormat={inputFormat}
            outputFormat={outputFormat}
            onInputFormatChange={setInputFormat}
            onOutputFormatChange={setOutputFormat}
            disabled={isViewOnly}
          />

          {/* Examples */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Examples</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addExample}>
                <Plus className="h-4 w-4 mr-1" /> Add Example
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {examples.map((example, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => removeExample(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Input</label>
                      <Textarea
                        value={example.input}
                        onChange={(e) => updateExample(index, "input", e.target.value)}
                        rows={2}
                        className="mt-1 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Output</label>
                      <Textarea
                        value={example.output}
                        onChange={(e) => updateExample(index, "output", e.target.value)}
                        rows={2}
                        className="mt-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Explanation (optional)</label>
                    <Input
                      value={example.explanation || ""}
                      onChange={(e) => updateExample(index, "explanation", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
              {examples.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No examples yet. Add one above.</p>
              )}
            </CardContent>
          </Card>

          {/* Constraints */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Constraints</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addConstraint}>
                <Plus className="h-4 w-4 mr-1" /> Add Constraint
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {constraints.map((constraint, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={constraint}
                    onChange={(e) => updateConstraint(index, e.target.value)}
                    placeholder="e.g., 1 <= nums.length <= 10^4"
                    className="font-mono text-sm"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeConstraint(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {constraints.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No constraints yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Hints */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Hints</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addHint}>
                <Plus className="h-4 w-4 mr-1" /> Add Hint
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {hints.map((hint, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={hint}
                    onChange={(e) => updateHint(index, e.target.value)}
                    placeholder="Add a helpful hint..."
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeHint(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {hints.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No hints yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Supported Languages - NEW */}
          <SupportedLanguagesSection
            selectedLanguages={selectedLanguages}
            onChange={setSelectedLanguages}
            disabled={isViewOnly}
          />

          {/* Time & Memory Limits - NEW */}
          <LimitsSection
            timeLimit={timeLimit}
            memoryLimit={memoryLimit}
            onTimeLimitChange={setTimeLimit}
            onMemoryLimitChange={setMemoryLimit}
            disabled={!canEditLimits}
          />

          {/* Function Signature - NEW */}
          <FunctionSignatureSection
            signature={functionSignature}
            onChange={setFunctionSignature}
            disabled={isViewOnly}
          />

          {/* Problem Tags - NEW */}
          <ProblemTagsSection
            tags={tags}
            onChange={setTags}
            disabled={isViewOnly}
          />

          {/* Test Cases - NEW */}
          <TestCasesSection
            testCases={testCases}
            onChange={setTestCases}
            disabled={!canEditTestCases}
          />

          {/* Starter Code - Updated to show only selected languages */}
          <Card>
            <CardHeader>
              <CardTitle>Starter Code</CardTitle>
              <p className="text-sm text-muted-foreground">
                Only showing languages selected above.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedLanguages.includes("python") && (
                <div>
                  <label className="text-sm font-medium">Python</label>
                  <Textarea
                    value={starterCode.python || ""}
                    onChange={(e) => setStarterCode({ ...starterCode, python: e.target.value })}
                    rows={4}
                    className="mt-1 font-mono text-sm"
                    placeholder="def solution():\n    pass"
                    disabled={isViewOnly}
                  />
                </div>
              )}
              {selectedLanguages.includes("javascript") && (
                <div>
                  <label className="text-sm font-medium">JavaScript</label>
                  <Textarea
                    value={starterCode.javascript || ""}
                    onChange={(e) => setStarterCode({ ...starterCode, javascript: e.target.value })}
                    rows={4}
                    className="mt-1 font-mono text-sm"
                    placeholder="function solution() {\n    \n}"
                    disabled={isViewOnly}
                  />
                </div>
              )}
              {selectedLanguages.includes("java") && (
                <div>
                  <label className="text-sm font-medium">Java</label>
                  <Textarea
                    value={starterCode.java || ""}
                    onChange={(e) => setStarterCode({ ...starterCode, java: e.target.value })}
                    rows={4}
                    className="mt-1 font-mono text-sm"
                    placeholder="class Solution {\n    public void solution() {\n    }\n}"
                    disabled={isViewOnly}
                  />
                </div>
              )}
              {selectedLanguages.includes("cpp") && (
                <div>
                  <label className="text-sm font-medium">C++</label>
                  <Textarea
                    value={starterCode.cpp || ""}
                    onChange={(e) => setStarterCode({ ...starterCode, cpp: e.target.value })}
                    rows={4}
                    className="mt-1 font-mono text-sm"
                    placeholder="class Solution {\npublic:\n    void solution() {\n    }\n};"
                    disabled={isViewOnly}
                  />
                </div>
              )}
              {selectedLanguages.includes("sql") && (
                <div>
                  <label className="text-sm font-medium">SQL</label>
                  <Textarea
                    value={starterCode.sql || ""}
                    onChange={(e) => setStarterCode({ ...starterCode, sql: e.target.value })}
                    rows={4}
                    className="mt-1 font-mono text-sm"
                    placeholder="SELECT * FROM table;"
                    disabled={isViewOnly}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solution */}
          <Card>
            <CardHeader>
              <CardTitle>Solution</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="solution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solution Code/Explanation</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={8} className="font-mono text-sm" placeholder="Provide the solution..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between border-t pt-6">
            <div className="text-sm text-muted-foreground">
              {!canPublish && form.watch("status") === "published" && (
                <span className="text-destructive">
                  Cannot publish: requires at least 1 hidden test case and 1 language.
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(`/admin/practice/skills/${skillId}/problems`)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending || isViewOnly}
                className="gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                {isEditing ? "Update Problem" : "Create Problem"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
