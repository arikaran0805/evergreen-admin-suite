/**
 * Moderator Sidebar Configuration
 * Maps 1:1 with moderator.routes.tsx
 * URL prefix: /moderator/*
 */
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  ClipboardList,
  Activity,
} from "lucide-react";
import type { SidebarConfig, SidebarSection } from "./types";

// Section 1: Overview - maps to /moderator/dashboard
const overviewSection: SidebarSection = {
  title: "Overview",
  items: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/moderator/dashboard" },
  ],
};

// Section 2: Content - maps to /moderator/content
const contentSection: SidebarSection = {
  title: "Content",
  items: [
    { icon: BookOpen, label: "My Content", path: "/moderator/content" },
  ],
};

// Section 3: Review - maps to /moderator/review, /moderator/comments
const reviewSection: SidebarSection = {
  title: "Review",
  items: [
    { icon: ClipboardList, label: "Review Queue", path: "/moderator/review" },
    { icon: MessageSquare, label: "Comments", path: "/moderator/comments" },
  ],
};

// Section 4: Activity - maps to /moderator/activity
const activitySection: SidebarSection = {
  title: "Activity",
  items: [
    { icon: Activity, label: "My Activity", path: "/moderator/activity" },
  ],
};

export const moderatorSidebarConfig: SidebarConfig = {
  sections: [
    overviewSection,
    contentSection,
    reviewSection,
    activitySection,
  ],
  roleLabel: "Moderator",
  roleColor: {
    badge: "text-accent",
    badgeBg: "bg-accent/10",
    badgeBorder: "border-accent/20",
    iconActive: "text-primary-foreground",
    iconDefault: "text-muted-foreground",
    avatarRing: "ring-accent/20",
    avatarBg: "bg-accent",
    avatarText: "text-accent-foreground",
  },
};

export default moderatorSidebarConfig;
