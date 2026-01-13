import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Cog, Zap, Database, FlaskConical, AlertTriangle, Trash2, RefreshCw } from "lucide-react";

const AdvancedSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheOptions, setCacheOptions] = useState({
    queryCache: true,
    localStorage: false,
    sessionStorage: false,
  });

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const cleared: string[] = [];
      if (cacheOptions.queryCache) {
        queryClient.clear();
        cleared.push("Query Cache");
      }
      if (cacheOptions.localStorage) {
        localStorage.clear();
        cleared.push("Local Storage");
      }
      if (cacheOptions.sessionStorage) {
        sessionStorage.clear();
        cleared.push("Session Storage");
      }
      toast({
        title: "Cache Cleared",
        description: `Cleared: ${cleared.join(", ")}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear cache",
        variant: "destructive",
      });
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F2A1D]">Advanced Settings</h2>
        <p className="text-sm text-[#1E1E1E]/60 mt-1">
          System-level configuration and experimental features
        </p>
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 p-4 bg-[#C9A24D]/10 border border-[#C9A24D]/30 rounded-xl">
        <AlertTriangle className="h-5 w-5 text-[#C9A24D] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-[#0F2A1D]">Advanced Settings</p>
          <p className="text-xs text-[#1E1E1E]/60 mt-0.5">
            Changes here may affect system performance and stability. Proceed with caution.
          </p>
        </div>
      </div>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Zap className="h-5 w-5 text-[#1E4D3A]" />
            Performance
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Optimize system performance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#FAFBF9] rounded-xl">
            <div>
              <Label className="text-sm font-medium text-[#1E1E1E]">Enable Query Caching</Label>
              <p className="text-xs text-[#1E1E1E]/50">Cache database queries for faster response</p>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#0F2A1D]"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#FAFBF9] rounded-xl">
            <div>
              <Label className="text-sm font-medium text-[#1E1E1E]">Enable Image Optimization</Label>
              <p className="text-xs text-[#1E1E1E]/50">Automatically compress and resize images</p>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#0F2A1D]"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#FAFBF9] rounded-xl">
            <div>
              <Label className="text-sm font-medium text-[#1E1E1E]">Lazy Loading</Label>
              <p className="text-xs text-[#1E1E1E]/50">Load images and content as needed</p>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#0F2A1D]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Database className="h-5 w-5 text-[#1E4D3A]" />
            Cache Management
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Clear cached data to refresh content
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-[#FAFBF9] rounded-lg">
              <Checkbox
                id="queryCache"
                checked={cacheOptions.queryCache}
                onCheckedChange={(checked) =>
                  setCacheOptions((prev) => ({ ...prev, queryCache: checked as boolean }))
                }
              />
              <div>
                <Label htmlFor="queryCache" className="text-sm font-medium text-[#1E1E1E] cursor-pointer">
                  Query Cache
                </Label>
                <p className="text-xs text-[#1E1E1E]/50">API responses and database queries</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#FAFBF9] rounded-lg">
              <Checkbox
                id="localStorage"
                checked={cacheOptions.localStorage}
                onCheckedChange={(checked) =>
                  setCacheOptions((prev) => ({ ...prev, localStorage: checked as boolean }))
                }
              />
              <div>
                <Label htmlFor="localStorage" className="text-sm font-medium text-[#1E1E1E] cursor-pointer">
                  Local Storage
                </Label>
                <p className="text-xs text-[#1E1E1E]/50">May reset user preferences</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#FAFBF9] rounded-lg">
              <Checkbox
                id="sessionStorage"
                checked={cacheOptions.sessionStorage}
                onCheckedChange={(checked) =>
                  setCacheOptions((prev) => ({ ...prev, sessionStorage: checked as boolean }))
                }
              />
              <div>
                <Label htmlFor="sessionStorage" className="text-sm font-medium text-[#1E1E1E] cursor-pointer">
                  Session Storage
                </Label>
                <p className="text-xs text-[#1E1E1E]/50">May require re-login</p>
              </div>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!Object.values(cacheOptions).some(Boolean) || clearingCache}
                className="border-[#E8EBE7] text-[#0F2A1D]"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${clearingCache ? 'animate-spin' : ''}`} />
                {clearingCache ? "Clearing..." : "Clear Selected Cache"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Cache?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear the selected cache types. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearCache} className="bg-[#0F2A1D]">
                  Clear Cache
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <FlaskConical className="h-5 w-5 text-[#1E4D3A]" />
            Feature Flags
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Enable or disable experimental features
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 border border-[#E8EBE7] rounded-xl">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-[#1E1E1E]">AI Content Suggestions</Label>
                  <Badge variant="outline" className="text-[10px] border-[#C9A24D] text-[#C9A24D]">
                    Beta
                  </Badge>
                </div>
                <p className="text-xs text-[#1E1E1E]/50">AI-powered content recommendations</p>
              </div>
            </div>
            <Switch className="data-[state=checked]:bg-[#0F2A1D]" />
          </div>

          <div className="flex items-center justify-between p-4 border border-[#E8EBE7] rounded-xl">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-[#1E1E1E]">Advanced Analytics</Label>
                  <Badge variant="outline" className="text-[10px] border-[#C9A24D] text-[#C9A24D]">
                    Experimental
                  </Badge>
                </div>
                <p className="text-xs text-[#1E1E1E]/50">Enhanced analytics dashboard</p>
              </div>
            </div>
            <Switch className="data-[state=checked]:bg-[#0F2A1D]" />
          </div>

          <div className="flex items-center justify-between p-4 border border-[#E8EBE7] rounded-xl">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-[#1E1E1E]">Real-time Collaboration</Label>
                  <Badge variant="outline" className="text-[10px] border-[#C9A24D] text-[#C9A24D]">
                    Alpha
                  </Badge>
                </div>
                <p className="text-xs text-[#1E1E1E]/50">Multiple editors on the same content</p>
              </div>
            </div>
            <Switch className="data-[state=checked]:bg-[#0F2A1D]" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Cog className="h-5 w-5 text-[#1E4D3A]" />
            Experimental Toggles
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Unstable features - use at your own risk
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="p-4 border-2 border-dashed border-[#C9A24D]/30 rounded-xl bg-[#C9A24D]/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-[#C9A24D] shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#0F2A1D]">Warning: Experimental Features</p>
                <p className="text-xs text-[#1E1E1E]/60 mt-1">
                  These features are still in development and may cause unexpected behavior.
                  Enable only if you understand the risks.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#FAFBF9] rounded-xl opacity-75">
            <div>
              <Label className="text-sm font-medium text-[#1E1E1E]">Debug Mode</Label>
              <p className="text-xs text-[#1E1E1E]/50">Show detailed error information</p>
            </div>
            <Switch className="data-[state=checked]:bg-[#C9A24D]" />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#FAFBF9] rounded-xl opacity-75">
            <div>
              <Label className="text-sm font-medium text-[#1E1E1E]">Developer Console</Label>
              <p className="text-xs text-[#1E1E1E]/50">Enable in-app developer tools</p>
            </div>
            <Switch className="data-[state=checked]:bg-[#C9A24D]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedSettings;
