/**
 * Senior Moderator Sidebar Configuration
 * Maps 1:1 with seniorModerator.routes.tsx
 * URL prefix: /senior-moderator/*
 */
import {
  LayoutDashboard,
  BookOpen,
  Tags,
  FileText,
  MessageSquare,
  Image,
  GraduationCap,
  MessageSquarePlus,
  CheckSquare,
  BarChart3,
  Users,
  Gavel,
  Activity,
} from "lucide-react";
import type { SidebarConfig, SidebarSection } from "./types";

// Section 1: Overview - maps to /senior-moderator/dashboard
const overviewSection: SidebarSection = {
  title: "Overview",
  items: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/senior-moderator/dashboard" },
  ],
};

// Section 2: Approval Queue - maps to /senior-moderator/approvals, /senior-moderator/reports
const approvalSection: SidebarSection = {
  title: "Approval Queue",
  items: [
    { icon: CheckSquare, label: "Approvals", path: "/senior-moderator/approvals" },
    { icon: Gavel, label: "Reports", path: "/senior-moderator/reports" },
  ],
};

// Section 3: Content - maps to posts, courses, tags, pages
const contentSection: SidebarSection = {
  title: "Content",
  items: [
    { icon: BookOpen, label: "Posts", path: "/senior-moderator/posts" },
    { icon: GraduationCap, label: "Courses", path: "/senior-moderator/courses" },
    { icon: Tags, label: "Tags", path: "/senior-moderator/tags" },
    { icon: FileText, label: "Pages", path: "/senior-moderator/pages" },
  ],
};

// Section 4: Moderation - maps to comments, annotations, media
const moderationSection: SidebarSection = {
  title: "Moderation",
  items: [
    { icon: MessageSquare, label: "Comments", path: "/senior-moderator/comments" },
    { icon: MessageSquarePlus, label: "Annotations", path: "/senior-moderator/annotations" },
    { icon: Image, label: "Media Library", path: "/senior-moderator/media" },
  ],
};

// Section 5: Analytics - maps to /senior-moderator/analytics
const analyticsSection: SidebarSection = {
  title: "Analytics",
  items: [
    { icon: BarChart3, label: "Content Analytics", path: "/senior-moderator/analytics" },
  ],
};

// Section 6: Activity - maps to activity, users
const activitySection: SidebarSection = {
  title: "Activity",
  items: [
    { icon: Activity, label: "Activity Log", path: "/senior-moderator/activity" },
    { icon: Users, label: "Users", path: "/senior-moderator/users" },
  ],
};

export const seniorModeratorSidebarConfig: SidebarConfig = {
  sections: [
    overviewSection,
    approvalSection,
    contentSection,
    moderationSection,
    analyticsSection,
    activitySection,
  ],
  roleLabel: "Senior Moderator",
  roleColor: {
    badge: "text-[#D4AF37]",
    badgeBg: "bg-transparent",
    badgeBorder: "border-[#D4AF37]",
    iconActive: "text-primary-foreground",
    iconDefault: "text-[#D4AF37]",
    avatarRing: "ring-[#D4AF37]/30",
    avatarBg: "bg-[#D4AF37]/10",
    avatarText: "text-[#D4AF37]",
  },
};

export default seniorModeratorSidebarConfig;
