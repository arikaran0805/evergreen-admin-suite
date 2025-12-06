import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnnouncementBarProps {
  message: string;
  link?: {
    text: string;
    url: string;
  };
  onClose?: () => void;
}

export const AnnouncementBar = ({ message, link, onClose }: AnnouncementBarProps) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-sm font-medium relative">
      <div className="container mx-auto flex items-center justify-center gap-2">
        <span>{message}</span>
        {link && (
          <a 
            href={link.url} 
            className="underline underline-offset-2 hover:opacity-80 transition-opacity font-semibold"
          >
            {link.text}
          </a>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
