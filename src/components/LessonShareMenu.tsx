import { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Share2, Linkedin } from "lucide-react";
import { trackPostShare } from "@/lib/shareAnalytics";

interface LessonShareMenuProps {
  postId: string;
  postTitle: string;
  postSlug: string;
  className?: string;
  alwaysVisible?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  vertical?: boolean;
}

const LessonShareMenu = ({ postId, postTitle, postSlug, className, alwaysVisible = false, side = "top", vertical = false }: LessonShareMenuProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const shareUrl = `${window.location.origin}/courses/${postSlug}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(postTitle);

  const scheduleOpen = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }

    // Small delay so hover-revealed buttons don't flicker
    openTimeoutRef.current = setTimeout(() => {
      setOpen(true);
    }, 120);
  };

  const scheduleClose = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }

    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 260);
  };

  const keepOpenNow = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    setOpen(true);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleShare = (platform: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (platform === "instagram") {
      navigator.clipboard.writeText(shareUrl);
      trackPostShare(postId, "instagram");
      toast({
        title: "Link copied for Instagram!",
        description: "Paste it in your Instagram story or bio.",
      });
      return;
    }

    if (platform === "whatsapp") {
      trackPostShare(postId, "whatsapp");
      window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, "_blank", "noopener,noreferrer");
      return;
    }
    
    if (platform === "linkedin") {
      trackPostShare(postId, "linkedin");
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, "_blank", "noopener,noreferrer");
      return;
    }

    if (platform === "twitter") {
      trackPostShare(postId, "twitter");
      window.open(
        `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const WhatsAppIcon = () => (
    <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );

  const InstagramIcon = () => (
    <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );

  const XIcon = () => (
    <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          ref={containerRef}
          className={`relative inline-block ${className || ""}`}
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
        >
          <button
            className={`p-1 rounded text-muted-foreground hover:text-foreground transition-opacity ${alwaysVisible || open ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </PopoverTrigger>

      <PopoverContent
        side={side}
        sideOffset={8}
        align="center"
        className={`p-0 border-0 bg-transparent shadow-none z-50 animate-in fade-in-0 zoom-in-95 duration-150 ${side === "right" ? "slide-in-from-left-2" : "slide-in-from-bottom-2"}`}
        onMouseEnter={keepOpenNow}
        onMouseLeave={scheduleClose}
      >
        <div
          onClick={handleMenuClick}
          className={`${vertical ? "flex flex-col" : "flex"} items-center gap-1 rounded-lg border border-border bg-popover px-2 py-1.5 shadow-xl`}
        >
          {/* WhatsApp */}
          <button
            onClick={(e) => handleShare("whatsapp", e)}
            className="flex items-center justify-center h-8 w-8 rounded-md text-[#25D366] hover:bg-[#25D366]/10 transition-all duration-150 hover:scale-105"
            title="WhatsApp"
          >
            <WhatsAppIcon />
          </button>

          {/* LinkedIn */}
          <button
            onClick={(e) => handleShare("linkedin", e)}
            className="flex items-center justify-center h-8 w-8 rounded-md text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-all duration-150 hover:scale-105"
            title="LinkedIn"
          >
            <Linkedin className="h-[18px] w-[18px]" />
          </button>

          {/* X */}
          <button
            onClick={(e) => handleShare("twitter", e)}
            className="flex items-center justify-center h-8 w-8 rounded-md text-foreground hover:bg-muted transition-all duration-150 hover:scale-105"
            title="X"
          >
            <XIcon />
          </button>

          {/* Instagram */}
          <button
            onClick={(e) => handleShare("instagram", e)}
            className="flex items-center justify-center h-8 w-8 rounded-md text-[#E4405F] hover:bg-[#E4405F]/10 transition-all duration-150 hover:scale-105"
            title="Instagram"
          >
            <InstagramIcon />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LessonShareMenu;
