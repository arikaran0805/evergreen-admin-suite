import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Share2, Linkedin, Copy, ChevronRight } from "lucide-react";
import { trackPostShare } from "@/lib/shareAnalytics";

interface ShareTooltipProps {
  title: string;
  url: string;
  postId?: string;
  children?: React.ReactNode;
}

const ShareTooltip = ({ title, url, postId, children }: ShareTooltipProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  // Reset social view when popover closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => setShowSocial(false), 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    
    const handleScroll = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [open]);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    if (postId) {
      trackPostShare(postId, "copy_link");
    }
    toast({
      title: "Link copied!",
      description: "The link has been copied to your clipboard.",
    });
    setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 1000);
  };

  const handleShowSocial = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSocial(true);
  };

  const handleShare = (platform: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (postId) {
      trackPostShare(postId, platform);
    }

    if (platform === "instagram") {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copied for Instagram!",
        description: "Paste it in your Instagram story or bio.",
      });
      setOpen(false);
      return;
    }

    let shareUrl = "";
    switch (platform) {
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
    setOpen(false);
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

  const XIcon = () => (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-transparent">
            <Share2 className="h-5 w-5 text-foreground" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="center"
        sideOffset={8}
        className="w-auto p-1 shadow-sm border-border/50 bg-popover/95 backdrop-blur-sm z-50"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {!showSocial ? (
          // Step 1: Copy link + Share
          <div className="flex flex-col gap-0.5 min-w-[120px]">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-sm hover:bg-muted transition-colors text-left"
            >
              <Copy className={`h-3.5 w-3.5 ${copied ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>{copied ? 'Copied!' : 'Copy link'}</span>
            </button>
            <button
              onClick={handleShowSocial}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm rounded-sm hover:bg-muted transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Share</span>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ) : (
          // Step 2: Social options
          <div className="flex items-center gap-0.5 animate-in fade-in-0 slide-in-from-left-1 duration-150">
            <button
              onClick={(e) => handleShare("whatsapp", e)}
              className="flex items-center justify-center h-7 w-7 rounded-sm text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
              title="WhatsApp"
            >
              <WhatsAppIcon />
            </button>
            <button
              onClick={(e) => handleShare("linkedin", e)}
              className="flex items-center justify-center h-7 w-7 rounded-sm text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-colors"
              title="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => handleShare("twitter", e)}
              className="flex items-center justify-center h-7 w-7 rounded-sm text-foreground hover:bg-muted transition-colors"
              title="X"
            >
              <XIcon />
            </button>
            <button
              onClick={(e) => handleShare("instagram", e)}
              className="flex items-center justify-center h-7 w-7 rounded-sm text-[#E4405F] hover:bg-[#E4405F]/10 transition-colors"
              title="Instagram"
            >
              <InstagramIcon />
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ShareTooltip;
