import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Flag, Lightbulb, Loader2 } from "lucide-react";
import { LightEditor, type LightEditorRef } from "@/components/tiptap/LightEditor";

interface ReportSuggestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: "post" | "course" | "comment" | "problem";
  contentId: string;
  contentTitle?: string;
  type: "report" | "suggestion";
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam or misleading" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "incorrect", label: "Incorrect information" },
  { value: "outdated", label: "Outdated content" },
  { value: "other", label: "Other" },
];

const ReportSuggestDialog = ({
  open,
  onOpenChange,
  contentType,
  contentId,
  contentTitle,
  type,
}: ReportSuggestDialogProps) => {
  const [reason, setReason] = useState("other");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const editorRef = useRef<LightEditorRef>(null);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please provide details about your " + (type === "report" ? "report" : "suggestion"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.from("content_reports").insert({
        content_type: contentType,
        content_id: contentId,
        report_type: type,
        reason: type === "report" ? reason : null,
        description: description.trim(),
        reporter_id: session?.user?.id || null,
        reporter_email: session?.user?.email || email || null,
      });

      if (error) throw error;

      toast({
        title: type === "report" ? "Report submitted" : "Suggestion submitted",
        description: "Thank you for your feedback. We'll review it shortly.",
      });
      
      onOpenChange(false);
      setDescription("");
      setReason("other");
      setEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isReport = type === "report";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReport ? (
              <>
                <Flag className="h-5 w-5 text-red-500" />
                Report Content
              </>
            ) : (
              <>
                <Lightbulb className="h-5 w-5 text-primary" />
                Suggest Changes
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {contentTitle && (
              <span className="block font-medium text-foreground mt-1">
                "{contentTitle}"
              </span>
            )}
            {isReport
              ? "Help us maintain quality content by reporting issues."
              : "Share your suggestions to improve this content."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isReport && (
            <div className="space-y-3">
              <Label>Reason for reporting</Label>
              <RadioGroup value={reason} onValueChange={setReason}>
                {REPORT_REASONS.map((r) => (
                  <div key={r.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={r.value} id={r.value} />
                    <Label htmlFor={r.value} className="font-normal cursor-pointer">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              {isReport ? "Additional details" : "Your suggestion"}
            </Label>
            <LightEditor
              ref={editorRef}
              value={description}
              onChange={setDescription}
              placeholder={
                isReport
                  ? "Please describe the issue in detail..."
                  : "Describe the changes you'd like to see..."
              }
              minHeight="100px"
              showCharCount={false}
              className="border rounded-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email (optional, for follow-up)
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !description.trim()}
              variant={isReport ? "destructive" : "default"}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isReport ? "Submit Report" : "Submit Suggestion"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportSuggestDialog;
