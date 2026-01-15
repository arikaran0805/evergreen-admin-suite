/**
 * Sidebar Configuration Types
 * Shared type definitions for role-based sidebar configurations
 */
import { LucideIcon } from "lucide-react";

export interface SidebarItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
  children?: SidebarItem[];
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export interface SidebarConfig {
  sections: SidebarSection[];
  roleLabel: string;
  roleColor: {
    badge: string;
    badgeBg: string;
    badgeBorder: string;
    iconActive: string;
    iconDefault: string;
    avatarRing: string;
    avatarBg: string;
    avatarText: string;
    activeBackground: string;
  };
}
