/**
 * useAuth Hook
 * 
 * Re-export from AuthContext for convenience.
 * This is the PRIMARY hook for accessing authentication state.
 */
export { useAuth, getRoleDashboardPath } from "@/contexts/AuthContext";
export type { AppRole, AuthState } from "@/contexts/AuthContext";
export { useViewAsRole } from "@/contexts/ViewAsRoleContext";
