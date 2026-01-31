import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface IOFormatSectionProps {
  inputFormat: string;
  outputFormat: string;
  onInputFormatChange: (value: string) => void;
  onOutputFormatChange: (value: string) => void;
  disabled?: boolean;
}

export function IOFormatSection({
  inputFormat,
  outputFormat,
  onInputFormatChange,
  onOutputFormatChange,
  disabled = false,
}: IOFormatSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Input / Output Format</CardTitle>
        <p className="text-sm text-muted-foreground">
          Defines how input is received and output is returned.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Input Format (Markdown supported)</Label>
          <Textarea
            value={inputFormat}
            onChange={(e) => onInputFormatChange(e.target.value)}
            rows={4}
            className="mt-1 font-mono text-sm"
            placeholder={`The first line contains an integer n — the number of elements.
The second line contains n space-separated integers.`}
            disabled={disabled}
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Output Format (Markdown supported)</Label>
          <Textarea
            value={outputFormat}
            onChange={(e) => onOutputFormatChange(e.target.value)}
            rows={4}
            className="mt-1 font-mono text-sm"
            placeholder={`Return a single integer — the sum of all elements.`}
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
