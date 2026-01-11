import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * AdminGuard - Protects routes that require admin role ONLY.
 * Does not allow senior_moderator or moderator access.
 */
const AdminGuard = ({ children }: AdminGuardProps) => {
  const { roles, isLoading, userId } = useUserRole();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!userId) {
        setIsAuthorized(false);
        return;
      }
      // Admin ONLY
      const hasPermission = roles.includes("admin");
      setIsAuthorized(hasPermission);
    }
  }, [isLoading, roles, userId]);

  if (isLoading || isAuthorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Verifying access...</div>
      </div>
    );
  }

  if (!userId) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isAuthorized) {
    return <Navigate to="/access-denied" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;
