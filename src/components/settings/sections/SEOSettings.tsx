import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Search, Share2, Image } from "lucide-react";

interface SEOSettingsProps {
  metaTitle: string;
  setMetaTitle: (value: string) => void;
  metaDescription: string;
  setMetaDescription: (value: string) => void;
  ogImage: string;
  setOgImage: (value: string) => void;
  ogTitle: string;
  setOgTitle: (value: string) => void;
  ogDescription: string;
  setOgDescription: (value: string) => void;
  readOnly?: boolean;
}

const SEOSettings = ({
  metaTitle,
  setMetaTitle,
  metaDescription,
  setMetaDescription,
  ogImage,
  setOgImage,
  ogTitle,
  setOgTitle,
  ogDescription,
  setOgDescription,
  readOnly = false,
}: SEOSettingsProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F2A1D]">SEO Settings</h2>
        <p className="text-sm text-[#1E1E1E]/60 mt-1">
          Optimize your site for search engines
        </p>
      </div>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Search className="h-5 w-5 text-[#1E4D3A]" />
            Meta Tags
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Default meta tags for search engines
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Meta Title</Label>
            <Input
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="UnlockMemory - Learn Through Visual Stories"
              maxLength={60}
              disabled={readOnly}
              className="border-[#E8EBE7] focus:border-[#1E4D3A] focus:ring-[#1E4D3A]/20"
            />
            <div className="flex justify-between">
              <p className="text-xs text-[#1E1E1E]/40">Appears in search results and browser tabs</p>
              <p className="text-xs text-[#1E1E1E]/40">{metaTitle.length}/60</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Meta Description</Label>
            <Textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="A brief description of your site for search results..."
              rows={3}
              maxLength={160}
              disabled={readOnly}
              className="border-[#E8EBE7] focus:border-[#1E4D3A] focus:ring-[#1E4D3A]/20 resize-none"
            />
            <div className="flex justify-between">
              <p className="text-xs text-[#1E1E1E]/40">Description shown in search results</p>
              <p className="text-xs text-[#1E1E1E]/40">{metaDescription.length}/160</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#FAFBF9] rounded-xl">
            <div>
              <Label className="text-sm font-medium text-[#1E1E1E]">Allow Search Indexing</Label>
              <p className="text-xs text-[#1E1E1E]/50">Let search engines index your site</p>
            </div>
            <Switch
              defaultChecked={true}
              disabled={readOnly}
              className="data-[state=checked]:bg-[#0F2A1D]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Share2 className="h-5 w-5 text-[#1E4D3A]" />
            Open Graph (Social Sharing)
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            How your site appears when shared on social media
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">OG Title</Label>
            <Input
              value={ogTitle}
              onChange={(e) => setOgTitle(e.target.value)}
              placeholder="Title when shared on social media"
              disabled={readOnly}
              className="border-[#E8EBE7] focus:border-[#1E4D3A] focus:ring-[#1E4D3A]/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">OG Description</Label>
            <Textarea
              value={ogDescription}
              onChange={(e) => setOgDescription(e.target.value)}
              placeholder="Description when shared on social media"
              rows={2}
              disabled={readOnly}
              className="border-[#E8EBE7] focus:border-[#1E4D3A] focus:ring-[#1E4D3A]/20 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Default OG Image</Label>
            <Input
              value={ogImage}
              onChange={(e) => setOgImage(e.target.value)}
              placeholder="https://example.com/og-image.jpg"
              disabled={readOnly}
              className="border-[#E8EBE7] focus:border-[#1E4D3A] focus:ring-[#1E4D3A]/20"
            />
            <p className="text-xs text-[#1E1E1E]/40">Recommended: 1200x630px</p>
          </div>

          {/* Preview Card */}
          <div className="border border-[#E8EBE7] rounded-xl overflow-hidden">
            <div className="aspect-[1.91/1] bg-[#FAFBF9] flex items-center justify-center">
              {ogImage ? (
                <img src={ogImage} alt="OG Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Image className="h-12 w-12 mx-auto text-[#1E1E1E]/20 mb-2" />
                  <p className="text-sm text-[#1E1E1E]/40">No image set</p>
                </div>
              )}
            </div>
            <div className="p-4 bg-white border-t border-[#E8EBE7]">
              <p className="text-xs text-[#1E1E1E]/40 uppercase tracking-wide mb-1">unlockmemory.com</p>
              <p className="font-semibold text-[#0F2A1D] line-clamp-1">{ogTitle || metaTitle || "Your Site Title"}</p>
              <p className="text-sm text-[#1E1E1E]/60 line-clamp-2 mt-1">
                {ogDescription || metaDescription || "Your site description will appear here"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SEOSettings;
