import { useState } from "react";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface FunctionParameter {
  id: string;
  name: string;
  type: string;
}

export interface FunctionSignature {
  name: string;
  parameters: FunctionParameter[];
  return_type: string;
}

const COMMON_TYPES = [
  "int",
  "int[]",
  "int[][]",
  "string",
  "string[]",
  "boolean",
  "float",
  "double",
  "List<int>",
  "List<string>",
  "Map<string, int>",
  "TreeNode",
  "ListNode",
  "void",
];

interface FunctionSignatureSectionProps {
  signature: FunctionSignature;
  onChange: (signature: FunctionSignature) => void;
  disabled?: boolean;
}

export function FunctionSignatureSection({
  signature,
  onChange,
  disabled = false,
}: FunctionSignatureSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const addParameter = () => {
    onChange({
      ...signature,
      parameters: [
        ...signature.parameters,
        { id: crypto.randomUUID(), name: "", type: "int" },
      ],
    });
  };

  const removeParameter = (id: string) => {
    onChange({
      ...signature,
      parameters: signature.parameters.filter((p) => p.id !== id),
    });
  };

  const updateParameter = (id: string, field: "name" | "type", value: string) => {
    onChange({
      ...signature,
      parameters: signature.parameters.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  const previewSignature = () => {
    const params = signature.parameters
      .map((p) => `${p.name}: ${p.type}`)
      .join(", ");
    return `${signature.name || "solution"}(${params}): ${signature.return_type || "void"}`;
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Function Definition
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Optional
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Define the function signature for auto-validation and cleaner starter code.
                </p>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Preview */}
            <div className="p-3 bg-muted/50 rounded-lg font-mono text-sm">
              {previewSignature()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Function Name</Label>
                <Input
                  value={signature.name}
                  onChange={(e) => onChange({ ...signature, name: e.target.value })}
                  placeholder="solution"
                  className="mt-1"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Return Type</Label>
                <Select
                  value={signature.return_type}
                  onValueChange={(v) => onChange({ ...signature, return_type: v })}
                  disabled={disabled}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Parameters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Parameters</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addParameter}
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Parameter
                </Button>
              </div>
              <div className="space-y-2">
                {signature.parameters.map((param, index) => (
                  <div key={param.id} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <Input
                      value={param.name}
                      onChange={(e) => updateParameter(param.id, "name", e.target.value)}
                      placeholder="paramName"
                      className="flex-1"
                      disabled={disabled}
                    />
                    <Select
                      value={param.type}
                      onValueChange={(v) => updateParameter(param.id, "type", v)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeParameter(param.id)}
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {signature.parameters.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No parameters defined.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
