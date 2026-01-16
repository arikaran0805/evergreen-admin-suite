/**
 * AuthContext - Single Source of Truth for Authentication & Role
 * 
 * ENTERPRISE SECURITY MODEL:
 * - One session = one active role (immutable during session)
 * - Role is resolved at login time from user_roles table
 * - No cross-role access or implicit inheritance
 * - Role context drives: sidebar, routes, permissions, search, notifications
 */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

// Role hierarchy for determining primary role (highest takes precedence)
const ROLE_PRIORITY: Record<AppRole, number> = {
  admin: 4,
  super_moderator: 3,
  senior_moderator: 2,
  moderator: 1,
  user: 0,
};

export interface AuthState {
  /** Unique user ID from Supabase Auth */
  userId: string | null;
  /** User object from Supabase */
  user: User | null;
  /** Session object from Supabase */
  session: Session | null;
  /** 
   * SINGLE active role for this session (immutable after resolution)
   * This is the ONLY role that matters for the current session
   */
  activeRole: AppRole | null;
  /** All roles the user has (for display purposes only, NOT for auth decisions) */
  allRoles: AppRole[];
  /** Whether authentication is still loading */
  isLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Error message if any */
  error: string | null;
}

interface AuthContextValue extends AuthState {
  /** Check if active role matches the given role */
  hasActiveRole: (role: AppRole) => boolean;
  /** Sign out and clear all state */
  signOut: () => Promise<void>;
  /** Force refresh the auth state (e.g., after role change notification) */
  refreshAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Resolves the primary (highest priority) role from all user roles
 * Returns null if no roles found
 */
const resolvePrimaryRole = (roles: AppRole[]): AppRole | null => {
  if (roles.length === 0) return null;
  
  return roles.reduce((highest, current) => {
    if (ROLE_PRIORITY[current] > ROLE_PRIORITY[highest]) {
      return current;
    }
    return highest;
  }, roles[0]);
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, setState] = useState<AuthState>({
    userId: null,
    user: null,
    session: null,
    activeRole: null,
    allRoles: [],
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  /**
   * Fetch user roles from database and resolve primary role
   */
  const fetchUserRoles = useCallback(async (userId: string): Promise<{
    allRoles: AppRole[];
    activeRole: AppRole | null;
  }> => {
    const { data: rolesData, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user roles:", error);
      throw error;
    }

    const allRoles = (rolesData || []).map((r) => r.role) as AppRole[];
    const activeRole = resolvePrimaryRole(allRoles);

    return { allRoles, activeRole };
  }, []);

  /**
   * Initialize auth state from session
   */
  const initializeAuth = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({
        userId: null,
        user: null,
        session: null,
        activeRole: null,
        allRoles: [],
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
      return;
    }

    try {
      const { allRoles, activeRole } = await fetchUserRoles(session.user.id);

      setState({
        userId: session.user.id,
        user: session.user,
        session,
        activeRole,
        allRoles,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (err: any) {
      setState({
        userId: session.user.id,
        user: session.user,
        session,
        activeRole: null,
        allRoles: [],
        isLoading: false,
        isAuthenticated: true,
        error: err.message,
      });
    }
  }, [fetchUserRoles]);

  /**
   * Refresh auth state (useful after role changes)
   */
  const refreshAuthState = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await initializeAuth(session);
  }, [initializeAuth]);

  /**
   * Sign out user and clear state
   */
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({
      userId: null,
      user: null,
      session: null,
      activeRole: null,
      allRoles: [],
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  }, []);

  /**
   * Check if user has the given role as their ACTIVE role
   * NOTE: This checks active role only, not all roles
   */
  const hasActiveRole = useCallback((role: AppRole): boolean => {
    return state.activeRole === role;
  }, [state.activeRole]);

  // Initialize auth on mount
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) {
        await initializeAuth(session);
      }
    };

    initialize();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (cancelled) return;

        // Handle sign out
        if (event === "SIGNED_OUT") {
          setState({
            userId: null,
            user: null,
            session: null,
            activeRole: null,
            allRoles: [],
            isLoading: false,
            isAuthenticated: false,
            error: null,
          });
          return;
        }

        // For sign in or token refresh, re-initialize with role fetch
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => {
            if (!cancelled) {
              initializeAuth(session);
            }
          }, 0);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  const value: AuthContextValue = {
    ...state,
    hasActiveRole,
    signOut,
    refreshAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access auth context
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Get the dashboard path for a given role
 */
export const getRoleDashboardPath = (role: AppRole | null): string => {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "super_moderator":
      return "/super-moderator/dashboard";
    case "senior_moderator":
      return "/senior-moderator/dashboard";
    case "moderator":
      return "/moderator/dashboard";
    default:
      return "/";
  }
};

export default AuthContext;
