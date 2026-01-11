/**
 * Admin Sidebar Configuration
 * Maps 1:1 with admin.routes.tsx
 * URL prefix: /admin/*
 */
import {
  LayoutDashboard,
  BookOpen,
  Files,
  Tags,
  Users,
  MessageSquare,
  Image,
  DollarSign,
  Link2,
  Key,
  Briefcase,
  Settings,
  BarChart3,
  Share2,
  GraduationCap,
  ClipboardCheck,
  Trash2,
  Flag,
  MessageSquarePlus,
} from "lucide-react";
import type { SidebarConfig, SidebarSection } from "./types";

// Section 1: Overview - maps to /admin/dashboard
const overviewSection: SidebarSection = {
  title: "Overview",
  items: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  ],
};

// Section 2: Workflows - maps to /admin/approvals, /admin/delete-requests, /admin/reports
const workflowSection: SidebarSection = {
  title: "Workflows",
  items: [
    { icon: ClipboardCheck, label: "Approval Queue", path: "/admin/approvals" },
    { icon: Trash2, label: "Delete Requests", path: "/admin/delete-requests" },
    { icon: Flag, label: "Reports", path: "/admin/reports" },
  ],
};

// Section 3: Content Management
const contentSection: SidebarSection = {
  title: "Content Management",
  items: [
    { icon: BookOpen, label: "Posts", path: "/admin/posts" },
    { icon: GraduationCap, label: "Courses", path: "/admin/courses" },
    { icon: Briefcase, label: "Careers", path: "/admin/careers" },
    { icon: Tags, label: "Tags", path: "/admin/tags" },
    { icon: Files, label: "Pages", path: "/admin/pages" },
    { icon: Image, label: "Media Library", path: "/admin/media" },
    { icon: MessageSquare, label: "Comments", path: "/admin/comments" },
    { icon: MessageSquarePlus, label: "Annotations", path: "/admin/annotations" },
  ],
};

// Section 4: Analytics
const analyticsSection: SidebarSection = {
  title: "Analytics",
  items: [
    { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
    { icon: Share2, label: "Social Analytics", path: "/admin/social-analytics" },
  ],
};

// Section 5: System & Business
const systemSection: SidebarSection = {
  title: "System & Business",
  items: [
    { icon: Users, label: "Users", path: "/admin/users" },
    { icon: Settings, label: "Roles & Permissions", path: "/admin/authors" },
    { icon: DollarSign, label: "Monetization", path: "/admin/monetization" },
    { icon: Link2, label: "Redirects", path: "/admin/redirects" },
    { icon: Key, label: "API & Integrations", path: "/admin/api" },
  ],
};

// Footer items (not in main sections)
export const adminFooterItems = [
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

export const adminSidebarConfig: SidebarConfig = {
  sections: [
    overviewSection,
    workflowSection,
    contentSection,
    analyticsSection,
    systemSection,
  ],
  roleLabel: "Admin",
  roleColor: {
    badge: "text-primary",
    badgeBg: "bg-primary/10",
    badgeBorder: "border-primary/20",
    iconActive: "text-primary-foreground",
    iconDefault: "text-muted-foreground",
    avatarRing: "ring-primary/20",
    avatarBg: "bg-primary",
    avatarText: "text-primary-foreground",
  },
};

export default adminSidebarConfig;
