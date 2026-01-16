import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface SuperModeratorGuardProps {
  children: ReactNode;
}

/**
 * SuperModeratorGuard - Protects routes that require super_moderator role ONLY.
 * 
 * SINGLE-ROLE ENFORCEMENT:
 * - Only users with activeRole === "super_moderator" can access
 * - No role inheritance (admin cannot access super_moderator routes)
 * - Redirects to /access-denied for unauthorized users
 */
const SuperModeratorGuard = ({ children }: SuperModeratorGuardProps) => {
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

  // STRICT: Only super_moderator role can access /super-moderator/* routes
  if (activeRole !== "super_moderator") {
    return <Navigate to="/access-denied" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default SuperModeratorGuard;
