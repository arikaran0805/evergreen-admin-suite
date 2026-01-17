import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ModeratorSidebar from "@/components/ModeratorSidebar";
import { GlobalCommandSearch } from "@/components/GlobalCommandSearch";

interface ModeratorLayoutProps {
  children: ReactNode;
  defaultSidebarCollapsed?: boolean;
}

const getPageTitle = (pathname: string): string => {
  const pageTitles: Record<string, string> = {
    "/moderator/dashboard": "Dashboard",
    "/moderator/content": "My Content",
    "/moderator/posts": "Posts",
    "/moderator/review": "Review Queue",
    "/moderator/comments": "Comments",
    "/moderator/activity": "My Activity",
  };

  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/moderator/posts/")) return "Edit Post";

  return "Moderator";
};

const ModeratorLayout = ({ children, defaultSidebarCollapsed = false }: ModeratorLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(!defaultSidebarCollapsed);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [commandSearchOpen, setCommandSearchOpen] = useState(false);
  const location = useLocation();
  const { userId } = useAuth();

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  return (
    <>
      <GlobalCommandSearch open={commandSearchOpen} onOpenChange={setCommandSearchOpen} />
      <div className="min-h-screen bg-background flex w-full">
        <ModeratorSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          userProfile={userProfile}
          userId={userId}
        />

        <main
          className={`flex-1 min-w-0 transition-all duration-300 ${
            sidebarOpen ? "pl-64" : "pl-[68px]"
          }`}
        >
          <div className="p-8">{children}</div>
        </main>
      </div>
    </>
  );
};

export default ModeratorLayout;
