import { ReactNode, useState, useCallback } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { AnnouncementBar } from "./AnnouncementBar";
import BackToTop from "./BackToTop";

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

const Layout = ({ children, showFooter = true }: LayoutProps) => {
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const handleAnnouncementVisibility = useCallback((visible: boolean) => {
    setShowAnnouncement(visible);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Announcement Bar */}
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <AnnouncementBar onVisibilityChange={handleAnnouncementVisibility} />
      </div>
      <Header announcementVisible={showAnnouncement} />
      {/* Add padding-top to account for fixed header + announcement bar */}
      <main className={`flex-1 ${showAnnouncement ? 'pt-32' : 'pt-24'}`}>
        {children}
      </main>
      {showFooter && <Footer />}
      <BackToTop />
    </div>
  );
};

export default Layout;
