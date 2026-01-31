import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LimitsSectionProps {
  timeLimit: number;
  memoryLimit: number;
  onTimeLimitChange: (value: number) => void;
  onMemoryLimitChange: (value: number) => void;
  disabled?: boolean;
}

export function LimitsSection({
  timeLimit,
  memoryLimit,
  onTimeLimitChange,
  onMemoryLimitChange,
  disabled = false,
}: LimitsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Time & Memory Limits</CardTitle>
        <p className="text-sm text-muted-foreground">
          Execution constraints for automated evaluation.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Time Limit (milliseconds)</Label>
            <Input
              type="number"
              value={timeLimit}
              onChange={(e) => onTimeLimitChange(parseInt(e.target.value) || 1000)}
              min={100}
              max={30000}
              className="mt-1"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground mt-1">Default: 1000ms</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Memory Limit (MB)</Label>
            <Input
              type="number"
              value={memoryLimit}
              onChange={(e) => onMemoryLimitChange(parseInt(e.target.value) || 256)}
              min={16}
              max={1024}
              className="mt-1"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground mt-1">Default: 256MB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
