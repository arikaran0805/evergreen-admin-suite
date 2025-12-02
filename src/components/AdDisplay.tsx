import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Ad {
  id: string;
  name: string;
  ad_code: string;
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
      .select("id, name, ad_code, placement, priority")
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

  return (
    <div 
      className={`ad-container ad-${placement} ${className}`}
      data-ad-id={ad.id}
      data-ad-placement={placement}
    >
      <div dangerouslySetInnerHTML={{ __html: ad.ad_code }} />
    </div>
  );
};

export default AdDisplay;
