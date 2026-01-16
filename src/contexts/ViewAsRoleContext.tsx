/**
 * ViewAsRoleContext - Admin-only feature to temporarily view other role dashboards
 * 
 * SECURITY MODEL:
 * - Only users with ACTUAL activeRole === "admin" can use this feature
 * - The viewAsRole is purely cosmetic for preview purposes
 * - Database operations still use the user's real identity/permissions
 * - The feature is session-local and does not persist
 */
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { AppRole } from "./AuthContext";

interface ViewAsRoleState {
  /** The role the admin is currently viewing as (null = not viewing as another role) */
  viewAsRole: AppRole | null;
  /** Whether the admin is currently in "view as" mode */
  isViewingAs: boolean;
}

interface ViewAsRoleContextValue extends ViewAsRoleState {
  /** Start viewing as a specific role */
  startViewingAs: (role: AppRole) => void;
  /** Stop viewing as another role and return to admin view */
  stopViewingAs: () => void;
  /** Get the effective role (viewAsRole if active, otherwise actual role) */
  getEffectiveRole: (actualRole: AppRole | null) => AppRole | null;
}

const ViewAsRoleContext = createContext<ViewAsRoleContextValue | undefined>(undefined);

interface ViewAsRoleProviderProps {
  children: ReactNode;
}

export const ViewAsRoleProvider = ({ children }: ViewAsRoleProviderProps) => {
  const [state, setState] = useState<ViewAsRoleState>({
    viewAsRole: null,
    isViewingAs: false,
  });

  const startViewingAs = useCallback((role: AppRole) => {
    setState({
      viewAsRole: role,
      isViewingAs: true,
    });
  }, []);

  const stopViewingAs = useCallback(() => {
    setState({
      viewAsRole: null,
      isViewingAs: false,
    });
  }, []);

  const getEffectiveRole = useCallback((actualRole: AppRole | null): AppRole | null => {
    // Only admins can use view-as feature
    if (actualRole !== "admin") {
      return actualRole;
    }
    // If admin is viewing as another role, return that role
    if (state.isViewingAs && state.viewAsRole) {
      return state.viewAsRole;
    }
    return actualRole;
  }, [state.isViewingAs, state.viewAsRole]);

  const value: ViewAsRoleContextValue = {
    ...state,
    startViewingAs,
    stopViewingAs,
    getEffectiveRole,
  };

  return (
    <ViewAsRoleContext.Provider value={value}>
      {children}
    </ViewAsRoleContext.Provider>
  );
};

/**
 * Hook to access ViewAsRole context
 * @throws Error if used outside ViewAsRoleProvider
 */
export const useViewAsRole = (): ViewAsRoleContextValue => {
  const context = useContext(ViewAsRoleContext);
  if (context === undefined) {
    throw new Error("useViewAsRole must be used within a ViewAsRoleProvider");
  }
  return context;
};

export default ViewAsRoleContext;
