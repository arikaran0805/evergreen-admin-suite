import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AnnouncementSettings {
  announcement_enabled: boolean;
  announcement_message: string | null;
  announcement_link_text: string | null;
  announcement_link_url: string | null;
  announcement_bg_color: string | null;
}

interface AnnouncementBarProps {
  onVisibilityChange?: (visible: boolean) => void;
}

export const AnnouncementBar = ({ onVisibilityChange }: AnnouncementBarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [settings, setSettings] = useState<AnnouncementSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("announcement_enabled, announcement_message, announcement_link_text, announcement_link_url, announcement_bg_color")
        .limit(1)
        .maybeSingle();

      if (data) {
        setSettings(data);
        const visible = data.announcement_enabled && !!data.announcement_message;
        setIsVisible(visible);
        onVisibilityChange?.(visible);
      }
    };

    fetchSettings();
  }, [onVisibilityChange]);

  const handleClose = () => {
    setIsVisible(false);
    onVisibilityChange?.(false);
  };

  if (!isVisible || !settings?.announcement_message) return null;

  const isExternalLink = settings.announcement_link_url?.startsWith("http");
  const bgColor = settings.announcement_bg_color || "#22c55e";

  return (
    <div 
      className="py-2 px-4 text-center text-sm font-medium relative text-white"
      style={{ backgroundColor: bgColor }}
    >
      <div className="container mx-auto flex items-center justify-center gap-2">
        <span>{settings.announcement_message}</span>
        {settings.announcement_link_text && settings.announcement_link_url && (
          isExternalLink ? (
            <a 
              href={settings.announcement_link_url} 
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80 transition-opacity font-semibold"
            >
              {settings.announcement_link_text}
            </a>
          ) : (
            <Link 
              to={settings.announcement_link_url} 
              className="underline underline-offset-2 hover:opacity-80 transition-opacity font-semibold"
            >
              {settings.announcement_link_text}
            </Link>
          )
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-white hover:bg-white/20"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
