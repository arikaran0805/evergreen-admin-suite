import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Facebook, Twitter, Copy, Check, Share2, Linkedin } from "lucide-react";
import { trackPostShare } from "@/lib/shareAnalytics";

interface ShareTooltipProps {
  title: string;
  url: string;
  postId?: string;
  children?: React.ReactNode;
}

const ShareTooltip = ({ title, url, postId, children }: ShareTooltipProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    instagram: null,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (postId) {
        trackPostShare(postId, "copy_link");
      }
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = (platform: string) => {
    if (platform === "instagram") {
      handleCopyLink();
      toast({
        title: "Link copied for Instagram!",
        description: "Paste this link in your Instagram story or bio.",
      });
      return;
    }
    
    const link = shareLinks[platform as keyof typeof shareLinks];
    if (link) {
      if (postId) {
        trackPostShare(postId, platform);
      }
      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  // Close on click outside
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
      document.removeEventListener("click", handleClickOutside);
    }
  };

  const handleMouseEnter = () => {
    setOpen(true);
    setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);
  };

  const handleMouseLeave = () => {
    setOpen(false);
    document.removeEventListener("click", handleClickOutside);
  };

  const WhatsAppIcon = () => (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );

  const InstagramIcon = () => (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );

  return (
    <div ref={containerRef} className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children || (
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-transparent">
          <Share2 className="h-5 w-5 text-foreground" />
        </Button>
      )}
      
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 z-50">
          <div className="bg-white border border-border rounded-2xl shadow-lg p-2 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#1877F2] hover:bg-[#1877F2]/10"
                onClick={() => handleShare("facebook")}
              >
                <Facebook className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#E4405F] hover:bg-[#E4405F]/10"
                onClick={() => handleShare("instagram")}
              >
                <InstagramIcon />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#25D366] hover:bg-[#25D366]/10"
                onClick={() => handleShare("whatsapp")}
              >
                <WhatsAppIcon />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-foreground hover:bg-muted"
                onClick={() => handleShare("twitter")}
              >
                <Twitter className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#0A66C2] hover:bg-[#0A66C2]/10"
                onClick={() => handleShare("linkedin")}
              >
                <Linkedin className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-5 bg-border mx-0.5" />
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-[6px]">
            <div className="w-3 h-3 bg-white border-r border-b border-border rotate-45 transform" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareTooltip;
