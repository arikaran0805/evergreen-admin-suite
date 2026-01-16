import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * AdminGuard - Protects routes that require admin role ONLY.
 * 
 * SINGLE-ROLE ENFORCEMENT:
 * - Only users with activeRole === "admin" can access
 * - No role inheritance (super_moderator, etc. cannot access)
 * - Redirects to /access-denied for unauthorized users
 */
const AdminGuard = ({ children }: AdminGuardProps) => {
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

  // STRICT: Only admin role can access /admin/* routes
  if (activeRole !== "admin") {
    return <Navigate to="/access-denied" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;
