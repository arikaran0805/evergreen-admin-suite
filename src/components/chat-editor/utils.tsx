import { icons } from "lucide-react";

/**
 * Renders a course icon - handles both emoji strings and Lucide icon names
 * @param icon - The icon identifier (emoji or Lucide icon name like "GitBranch")
 * @param size - Size in pixels for Lucide icons (default: 16)
 * @returns React node with the rendered icon
 */
export const renderCourseIcon = (icon: string | null, size: number = 16) => {
  if (!icon) return "📚";
  
  // Check if it's an emoji (starts with an emoji character)
  const emojiRegex = /^[\p{Emoji}]/u;
  if (emojiRegex.test(icon)) {
    return icon;
  }
  
  // Try to render as Lucide icon
  const LucideIcon = icons[icon as keyof typeof icons];
  if (LucideIcon && typeof LucideIcon !== "function" || (LucideIcon && "$$typeof" in LucideIcon)) {
    const IconComponent = LucideIcon as React.ComponentType<{ size?: number }>;
    return <IconComponent size={size} />;
  }
  
  return "📚";
};
