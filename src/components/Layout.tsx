import { ReactNode, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { AnnouncementBar } from "./AnnouncementBar";

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

const Layout = ({ children, showFooter = true }: LayoutProps) => {
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Announcement Bar */}
      {showAnnouncement && (
        <div className="fixed top-0 left-0 right-0 z-[60]">
          <AnnouncementBar 
            message="🎉 New courses available! Learn the latest skills today."
            link={{ text: "Explore now →", url: "/courses" }}
            onClose={() => setShowAnnouncement(false)}
          />
        </div>
      )}
      <Header announcementVisible={showAnnouncement} />
      {/* Add padding-top to account for fixed header + announcement bar */}
      <main className={`flex-1 ${showAnnouncement ? 'pt-32' : 'pt-24'}`}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout;
