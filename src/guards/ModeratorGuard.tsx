import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

interface ModeratorGuardProps {
  children: ReactNode;
}

/**
 * ModeratorGuard - Protects routes for admin, senior_moderator, and moderator roles.
 */
const ModeratorGuard = ({ children }: ModeratorGuardProps) => {
  const { roles, isLoading, userId } = useUserRole();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!userId) {
        setIsAuthorized(false);
        return;
      }
      // Admin + Senior Moderator + Moderator
      const hasPermission = 
        roles.includes("admin") || 
        roles.includes("senior_moderator") || 
        roles.includes("moderator");
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

export default ModeratorGuard;
