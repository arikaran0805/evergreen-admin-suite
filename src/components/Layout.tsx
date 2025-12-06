import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

const Layout = ({ children, showFooter = true }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      {/* Add padding-top to account for fixed header (primary: h-14, secondary: h-10) */}
      <main className="flex-1 pt-24">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout;
