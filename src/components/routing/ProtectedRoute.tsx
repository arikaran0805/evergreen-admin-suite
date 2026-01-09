import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: AppRole[];
  redirectTo?: string;
}

/**
 * ProtectedRoute component that enforces role-based access control.
 * Prevents layout flash by showing nothing during loading.
 */
const ProtectedRoute = ({ 
  children, 
  allowedRoles, 
  redirectTo = "/access-denied" 
}: ProtectedRouteProps) => {
  const { roles, isLoading, userId } = useUserRole();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      // Check if user is not logged in
      if (!userId) {
        setIsAuthorized(false);
        return;
      }

      // Check if user has any of the allowed roles
      const hasPermission = allowedRoles.some(role => roles.includes(role));
      setIsAuthorized(hasPermission);
    }
  }, [isLoading, roles, allowedRoles, userId]);

  // Still loading - show nothing to prevent flash
  if (isLoading || isAuthorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Verifying access...</div>
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!userId) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Not authorized - redirect to access denied
  if (!isAuthorized) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Authorized - render children
  return <>{children}</>;
};

export default ProtectedRoute;
