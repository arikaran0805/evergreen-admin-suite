import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface SeniorModeratorGuardProps {
  children: ReactNode;
}

/**
 * SeniorModeratorGuard - Protects routes that require senior_moderator role ONLY.
 * 
 * SINGLE-ROLE ENFORCEMENT:
 * - Only users with activeRole === "senior_moderator" can access
 * - No role inheritance (admin/super_moderator cannot access)
 * - Redirects to /access-denied for unauthorized users
 */
const SeniorModeratorGuard = ({ children }: SeniorModeratorGuardProps) => {
  const { activeRole, isLoading, isAuthenticated, userId } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Verifying access...</div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!isAuthenticated || !userId) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // STRICT: Only senior_moderator role can access /senior-moderator/* routes
  if (activeRole !== "senior_moderator") {
    return <Navigate to="/access-denied" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default SeniorModeratorGuard;
