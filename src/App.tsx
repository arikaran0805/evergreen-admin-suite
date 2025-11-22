import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Blogs from "./pages/Blogs";
import BlogDetail from "./pages/BlogDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AdminPosts from "./pages/AdminPosts";
import AdminPages from "./pages/AdminPages";
import AdminCategories from "./pages/AdminCategories";
import AdminComments from "./pages/AdminComments";
import AdminUsers from "./pages/AdminUsers";
import AdminPlaceholder from "./pages/AdminPlaceholder";
import AdminAnalytics from "./pages/AdminAnalytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blog/:id" element={<BlogDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/posts" element={<AdminPosts />} />
          <Route path="/admin/pages" element={<AdminPages />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/comments" element={<AdminComments />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/tags" element={<AdminPlaceholder title="Tags Management" description="Manage blog tags, create bulk operations, and enable auto-suggestions." />} />
          <Route path="/admin/authors" element={<AdminPlaceholder title="Authors & Admins" description="Manage author accounts, roles, and permissions." />} />
          <Route path="/admin/media" element={<AdminPlaceholder title="Media Library" description="Upload, rename, compress, and manage media files." />} />
          <Route path="/admin/monetization" element={<AdminPlaceholder title="Monetization" description="Manage ads, placements, and rotation rules." />} />
          <Route path="/admin/redirects" element={<AdminPlaceholder title="Redirect Rules" description="Create and manage 301/302 redirects." />} />
          <Route path="/admin/api-keys" element={<AdminPlaceholder title="API Keys & Tokens" description="Generate, revoke, and manage API access." />} />
          <Route path="/admin/webhooks" element={<AdminPlaceholder title="Webhooks" description="Create webhooks and trigger events." />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/settings" element={<AdminPlaceholder title="Settings" description="Configure system settings, DNS, SSL, CDN, and more." />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
