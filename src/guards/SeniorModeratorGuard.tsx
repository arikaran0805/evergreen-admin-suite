import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

interface SeniorModeratorGuardProps {
  children: ReactNode;
}

/**
 * SeniorModeratorGuard - Protects routes for admin and senior_moderator roles.
 */
const SeniorModeratorGuard = ({ children }: SeniorModeratorGuardProps) => {
  const { roles, isLoading, userId } = useUserRole();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!userId) {
        setIsAuthorized(false);
        return;
      }
      // Admin + Senior Moderator
      const hasPermission = roles.includes("admin") || roles.includes("senior_moderator");
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

export default SeniorModeratorGuard;
