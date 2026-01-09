import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldX, Home, ArrowLeft } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const AccessDenied = () => {
  const navigate = useNavigate();
  const { isAdmin, isSeniorModerator, isModerator, userId } = useUserRole();

  const getHomeRoute = () => {
    if (isAdmin) return "/admin/dashboard";
    if (isSeniorModerator) return "/senior-moderator/dashboard";
    if (isModerator) return "/moderator/dashboard";
    return "/";
  };

  const getRoleName = () => {
    if (isAdmin) return "Admin";
    if (isSeniorModerator) return "Senior Moderator";
    if (isModerator) return "Moderator";
    return "User";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-12 h-12 text-destructive" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
            {userId && (
              <span className="block mt-2 text-sm">
                Current role: <span className="font-medium text-foreground">{getRoleName()}</span>
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Button asChild className="gap-2">
            <Link to={getHomeRoute()}>
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>

        {/* Help text */}
        <p className="text-sm text-muted-foreground">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  );
};

export default AccessDenied;
