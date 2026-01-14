/**
 * Sidebar Configuration Exports
 * Each role imports ONLY its own sidebar config
 */
export * from "./types";
export { adminSidebarConfig, adminFooterItems } from "./admin.sidebar";
export { superModeratorSidebarConfig } from "./superModerator.sidebar";
export { seniorModeratorSidebarConfig } from "./seniorModerator.sidebar";
export { moderatorSidebarConfig } from "./moderator.sidebar";
