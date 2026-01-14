/**
 * Super Moderator Sidebar Configuration
 * Maps 1:1 with superModerator.routes.tsx
 * URL prefix: /super-moderator/*
 * 
 * Super Moderator is a CAREER OWNER - manages assigned careers
 * and all courses/posts within those careers.
 */
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Briefcase,
  Tags,
  FileText,
  MessageSquare,
  Image,
  MessageSquarePlus,
  CheckSquare,
  BarChart3,
  Users,
  Gavel,
  Activity,
  UserCog,
} from "lucide-react";
import type { SidebarConfig, SidebarSection } from "./types";

// Section 1: Overview - maps to /super-moderator/dashboard
const overviewSection: SidebarSection = {
  title: "Overview",
  items: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/super-moderator/dashboard" },
  ],
};

// Section 2: Approval Queue - maps to /super-moderator/approvals, /super-moderator/reports
const approvalSection: SidebarSection = {
  title: "Approval Queue",
  items: [
    { icon: CheckSquare, label: "Approvals", path: "/super-moderator/approvals" },
    { icon: Gavel, label: "Reports", path: "/super-moderator/reports" },
  ],
};

// Section 3: Career Management - Super Moderator's primary scope
const careerSection: SidebarSection = {
  title: "Career Management",
  items: [
    { icon: Briefcase, label: "My Careers", path: "/super-moderator/careers" },
    { icon: GraduationCap, label: "Courses", path: "/super-moderator/courses" },
    { icon: BookOpen, label: "Posts", path: "/super-moderator/posts" },
  ],
};

// Section 4: Content - maps to tags, pages
const contentSection: SidebarSection = {
  title: "Content",
  items: [
    { icon: Tags, label: "Tags", path: "/super-moderator/tags" },
    { icon: FileText, label: "Pages", path: "/super-moderator/pages" },
  ],
};

// Section 5: Moderation - maps to comments, annotations, media
const moderationSection: SidebarSection = {
  title: "Moderation",
  items: [
    { icon: MessageSquare, label: "Comments", path: "/super-moderator/comments" },
    { icon: MessageSquarePlus, label: "Annotations", path: "/super-moderator/annotations" },
    { icon: Image, label: "Media Library", path: "/super-moderator/media" },
  ],
};

// Section 6: Team Management
const teamSection: SidebarSection = {
  title: "Team",
  items: [
    { icon: UserCog, label: "Assignments", path: "/super-moderator/assignments" },
    { icon: Users, label: "Users", path: "/super-moderator/users" },
  ],
};

// Section 7: Analytics - maps to /super-moderator/analytics
const analyticsSection: SidebarSection = {
  title: "Analytics",
  items: [
    { icon: BarChart3, label: "Content Analytics", path: "/super-moderator/analytics" },
    { icon: Activity, label: "Activity Log", path: "/super-moderator/activity" },
  ],
};

export const superModeratorSidebarConfig: SidebarConfig = {
  sections: [
    overviewSection,
    approvalSection,
    careerSection,
    contentSection,
    moderationSection,
    teamSection,
    analyticsSection,
  ],
  roleLabel: "Super Moderator",
  roleColor: {
    badge: "text-[#8B5CF6]",
    badgeBg: "bg-transparent",
    badgeBorder: "border-[#8B5CF6]",
    iconActive: "text-primary-foreground",
    iconDefault: "text-[#8B5CF6]",
    avatarRing: "ring-[#8B5CF6]/30",
    avatarBg: "bg-[#8B5CF6]/10",
    avatarText: "text-[#8B5CF6]",
  },
};

export default superModeratorSidebarConfig;
