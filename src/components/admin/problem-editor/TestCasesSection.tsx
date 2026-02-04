import { useState } from "react";
import { Plus, Trash2, Upload, ClipboardPaste, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_visible: boolean;
}

interface TestCasesSectionProps {
  testCases: TestCase[];
  onChange: (testCases: TestCase[]) => void;
  disabled?: boolean;
}

export function TestCasesSection({ testCases, onChange, disabled = false }: TestCasesSectionProps) {
  const [bulkInput, setBulkInput] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);

  const addTestCase = () => {
    onChange([
      ...testCases,
      {
        id: crypto.randomUUID(),
        input: "",
        expected_output: "",
        is_visible: false,
      },
    ]);
  };

  const removeTestCase = (id: string) => {
    onChange(testCases.filter((tc) => tc.id !== id));
  };

  const updateTestCase = (id: string, field: keyof TestCase, value: string | boolean) => {
    onChange(
      testCases.map((tc) =>
        tc.id === id ? { ...tc, [field]: value } : tc
      )
    );
  };

  const handleBulkPaste = () => {
    try {
      // Parse format: input|||output separated by newlines for multiple cases
      const cases = bulkInput.split("\n---\n").filter(Boolean);
      const newCases: TestCase[] = cases.map((caseStr) => {
        const [input, output] = caseStr.split("|||");
        return {
          id: crypto.randomUUID(),
          input: input?.trim() || "",
          expected_output: output?.trim() || "",
          is_visible: false,
        };
      });
      onChange([...testCases, ...newCases]);
      setBulkInput("");
      setBulkDialogOpen(false);
    } catch {
      // Invalid format, ignore
    }
  };

  const handleJsonUpload = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const cases = Array.isArray(parsed) ? parsed : [parsed];
      const newCases: TestCase[] = cases.map((c: any) => ({
        id: crypto.randomUUID(),
        input: String(c.input || ""),
        expected_output: String(c.expected_output || c.output || ""),
        is_visible: Boolean(c.is_visible || false),
      }));
      onChange([...testCases, ...newCases]);
      setJsonInput("");
      setJsonDialogOpen(false);
    } catch {
      // Invalid JSON, ignore
    }
  };

  const hiddenCount = testCases.filter((tc) => !tc.is_visible).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Test Cases (Hidden from Learners)</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Used for automated evaluation. {hiddenCount} hidden test case{hiddenCount !== 1 ? "s" : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={disabled}>
                <ClipboardPaste className="h-4 w-4 mr-1" /> Bulk Paste
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Paste Test Cases</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Format: input|||expected_output<br />
                  Separate multiple cases with --- on a new line.
                </p>
                <Textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder={`[1,2,3]|||6\n---\n[4,5]|||9`}
                />
                <Button type="button" onClick={handleBulkPaste} className="w-full">
                  Import Test Cases
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={disabled}>
                <Upload className="h-4 w-4 mr-1" /> Upload JSON
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Test Cases as JSON</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Array of objects with input and expected_output fields.
                </p>
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder={`[
  {"input": "[1,2,3]", "expected_output": "6"},
  {"input": "[4,5]", "expected_output": "9"}
]`}
                />
                <Button type="button" onClick={handleJsonUpload} className="w-full">
                  Import from JSON
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button type="button" variant="outline" size="sm" onClick={addTestCase} disabled={disabled}>
            <Plus className="h-4 w-4 mr-1" /> Add Test Case
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {testCases.map((testCase, index) => (
          <div key={testCase.id} className="border rounded-lg p-4 space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Test Case #{index + 1}</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {testCase.is_visible ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label htmlFor={`visible-${testCase.id}`} className="text-sm">
                    Visible to learners
                  </Label>
                  <Switch
                    id={`visible-${testCase.id}`}
                    checked={testCase.is_visible}
                    onCheckedChange={(v) => updateTestCase(testCase.id, "is_visible", v)}
                    disabled={disabled}
                  />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Test Case?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeTestCase(testCase.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Input</Label>
                <Textarea
                  value={testCase.input}
                  onChange={(e) => updateTestCase(testCase.id, "input", e.target.value)}
                  rows={3}
                  className="mt-1 font-mono text-sm bg-muted/50"
                  placeholder="[1, 2, 3, 4]"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Expected Output</Label>
                <Textarea
                  value={testCase.expected_output}
                  onChange={(e) => updateTestCase(testCase.id, "expected_output", e.target.value)}
                  rows={3}
                  className="mt-1 font-mono text-sm bg-muted/50"
                  placeholder="10"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        ))}
        {testCases.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">No test cases yet.</p>
            <p className="text-xs text-destructive">
              At least one hidden test case is required to publish.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
