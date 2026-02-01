import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import type { PracticeEditorSettings } from "@/hooks/usePracticeEditorSettings";

type Props = {
  settings: PracticeEditorSettings;
  onChange: <K extends keyof PracticeEditorSettings>(
    key: K,
    value: PracticeEditorSettings[K],
  ) => void;
  triggerClassName?: string;
};

export function PracticeEditorSettingsPopover({
  settings,
  onChange,
  triggerClassName,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", triggerClassName)}
          title="Editor settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Editor Settings</h4>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Font Size</Label>
              <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
            </div>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([value]) => onChange("fontSize", value)}
              min={10}
              max={24}
              step={1}
              className="w-full"
            />
          </div>

          {/* Tab Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Tab Size</Label>
              <span className="text-xs text-muted-foreground">{settings.tabSize} spaces</span>
            </div>
            <Slider
              value={[settings.tabSize]}
              onValueChange={([value]) => onChange("tabSize", value)}
              min={2}
              max={8}
              step={2}
              className="w-full"
            />
          </div>

          {/* Word Wrap */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Word Wrap</Label>
            <Switch checked={settings.wordWrap} onCheckedChange={(v) => onChange("wordWrap", v)} />
          </div>

          {/* Line Numbers */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Line Numbers</Label>
            <Switch
              checked={settings.lineNumbers}
              onCheckedChange={(v) => onChange("lineNumbers", v)}
            />
          </div>

          {/* Minimap */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Minimap</Label>
            <Switch checked={settings.minimap} onCheckedChange={(v) => onChange("minimap", v)} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
