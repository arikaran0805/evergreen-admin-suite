import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Ad {
  id: string;
  name: string;
  ad_code: string | null;
  image_url: string | null;
  redirect_url: string | null;
  placement: string;
  priority: number;
}

interface AdDisplayProps {
  placement: string;
  className?: string;
}

const AdDisplay = ({ placement, className = "" }: AdDisplayProps) => {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    fetchAd();
  }, [placement]);

  const fetchAd = async () => {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from("ads")
      .select("id, name, ad_code, image_url, redirect_url, placement, priority")
      .eq("placement", placement)
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order("priority", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setAd(data);
    }
  };

  if (!ad) return null;

  // If there's custom ad code, use that (for AdSense or other scripts)
  if (ad.ad_code) {
    return (
      <div 
        className={`ad-container ad-${placement} ${className}`}
        data-ad-id={ad.id}
        data-ad-placement={placement}
      >
        <div dangerouslySetInnerHTML={{ __html: ad.ad_code }} />
      </div>
    );
  }

  // Otherwise, render image ad with optional redirect
  if (ad.image_url) {
    const imageElement = (
      <img 
        src={ad.image_url} 
        alt={ad.name || "Advertisement"} 
        className="max-w-full h-auto"
        loading="lazy"
      />
    );

    return (
      <div 
        className={`ad-container ad-${placement} ${className}`}
        data-ad-id={ad.id}
        data-ad-placement={placement}
      >
        {ad.redirect_url ? (
          <a 
            href={ad.redirect_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            {imageElement}
          </a>
        ) : (
          imageElement
        )}
      </div>
    );
  }

  return null;
};

export default AdDisplay;
