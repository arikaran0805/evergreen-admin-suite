import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Palette, Upload, Image, Trash2, Eye } from "lucide-react";

interface BrandingSettingsProps {
  logoUrl: string;
  setLogoUrl: (value: string) => void;
  siteName: string;
  onLogoUpload: (file: File) => Promise<void>;
  uploadingLogo: boolean;
  readOnly?: boolean;
}

const BrandingSettings = ({
  logoUrl,
  setLogoUrl,
  siteName,
  onLogoUpload,
  uploadingLogo,
  readOnly = false,
}: BrandingSettingsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onLogoUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F2A1D]">Branding</h2>
        <p className="text-sm text-[#1E1E1E]/60 mt-1">
          Customize your platform's visual identity
        </p>
      </div>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Image className="h-5 w-5 text-[#1E4D3A]" />
            Logo
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Your primary brand logo
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-6">
            {/* Logo Preview */}
            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-[#E8EBE7] flex items-center justify-center bg-[#FAFBF9] overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="text-center p-4">
                  <Image className="h-8 w-8 mx-auto text-[#1E1E1E]/30 mb-2" />
                  <span className="text-xs text-[#1E1E1E]/40">No logo</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={readOnly}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo || readOnly}
                className="border-[#E8EBE7] hover:bg-[#FAFBF9] text-[#0F2A1D]"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
              </Button>
              
              {logoUrl && !readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogoUrl("")}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}

              <p className="text-xs text-[#1E1E1E]/40">
                Recommended: PNG or SVG, at least 200x200px
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Image className="h-5 w-5 text-[#1E4D3A]" />
            Favicon
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            The small icon shown in browser tabs
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-[#E8EBE7] flex items-center justify-center bg-[#FAFBF9]">
              <span className="text-2xl">🧠</span>
            </div>
            <div className="flex-1 space-y-3">
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/*,.ico"
                className="hidden"
                disabled={readOnly}
              />
              <Button
                variant="outline"
                onClick={() => faviconInputRef.current?.click()}
                disabled={readOnly}
                className="border-[#E8EBE7] hover:bg-[#FAFBF9] text-[#0F2A1D]"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Favicon
              </Button>
              <p className="text-xs text-[#1E1E1E]/40">
                Recommended: ICO or PNG, 32x32px or 64x64px
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Palette className="h-5 w-5 text-[#1E4D3A]" />
            Brand Colors
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Your platform's color scheme
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Primary Color</Label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0F2A1D] border border-[#E8EBE7]" />
              <Input
                value="#0F2A1D"
                disabled
                className="w-32 font-mono text-sm bg-[#FAFBF9] border-[#E8EBE7]"
              />
              <span className="text-xs text-[#1E1E1E]/40">Forest Green (Read-only)</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Secondary Color</Label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#1E4D3A] border border-[#E8EBE7]" />
              <Input
                value="#1E4D3A"
                disabled
                className="w-32 font-mono text-sm bg-[#FAFBF9] border-[#E8EBE7]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Accent Color</Label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#C9A24D] border border-[#E8EBE7]" />
              <Input
                value="#C9A24D"
                disabled
                className="w-32 font-mono text-sm bg-[#FAFBF9] border-[#E8EBE7]"
              />
              <span className="text-xs text-[#1E1E1E]/40">Champagne Gold (Admin indicators only)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Eye className="h-5 w-5 text-[#1E4D3A]" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="border border-[#E8EBE7] rounded-xl p-6 bg-white">
            <div className="flex items-center gap-3 mb-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-10 w-auto" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-[#0F2A1D] flex items-center justify-center">
                  <span className="text-white font-bold">{siteName?.charAt(0) || "U"}</span>
                </div>
              )}
              <span className="text-xl font-bold text-[#0F2A1D]">{siteName || "UnlockMemory"}</span>
            </div>
            <div className="flex gap-2">
              <div className="px-4 py-2 bg-[#0F2A1D] text-white rounded-lg text-sm font-medium">
                Primary Button
              </div>
              <div className="px-4 py-2 border border-[#0F2A1D] text-[#0F2A1D] rounded-lg text-sm font-medium">
                Secondary Button
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandingSettings;
