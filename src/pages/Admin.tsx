import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import AdminDashboard from "./AdminDashboard";
import ModeratorDashboard from "./ModeratorDashboard";

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Access Denied",
          description: "Please login first",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "moderator"]);

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        toast({
          title: "Access Denied",
          description: "You don't have admin or moderator privileges",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const roles = roleData.map((r) => r.role);
      const hasAdmin = roles.includes("admin");
      const hasModerator = roles.includes("moderator");
      
      setIsAdmin(hasAdmin);
      setIsModerator(hasModerator && !hasAdmin);
      setLoading(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Checking permissions...</div>
        </div>
      </AdminLayout>
    );
  }

  // Route to appropriate dashboard based on role
  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isModerator) {
    return <ModeratorDashboard />;
  }

  return null;
};

export default Admin;
