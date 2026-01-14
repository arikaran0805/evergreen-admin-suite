import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRoleState {
  userId: string | null;
  roles: AppRole[];
  isAdmin: boolean;
  isSuperModerator: boolean;
  isSeniorModerator: boolean;
  isModerator: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useUserRole = () => {
  const [state, setState] = useState<UserRoleState>({
    userId: null,
    roles: [],
    isAdmin: false,
    isSuperModerator: false,
    isSeniorModerator: false,
    isModerator: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchRoles = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          if (!cancelled) {
            setState({
              userId: null,
              roles: [],
              isAdmin: false,
              isSuperModerator: false,
              isSeniorModerator: false,
              isModerator: false,
              isLoading: false,
              error: null,
            });
          }
          return;
        }

        const { data: rolesData, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        if (error) throw error;

        const roles = (rolesData || []).map((r) => r.role) as AppRole[];
        
        if (!cancelled) {
          setState({
            userId: session.user.id,
            roles,
            isAdmin: roles.includes("admin"),
            isSuperModerator: roles.includes("super_moderator"),
            isSeniorModerator: roles.includes("senior_moderator"),
            isModerator: roles.includes("moderator"),
            isLoading: false,
            error: null,
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err.message,
          }));
        }
      }
    };

    fetchRoles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchRoles();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = (role: AppRole) => state.roles.includes(role);
  const hasAnyRole = (...rolesToCheck: AppRole[]) => 
    rolesToCheck.some((r) => state.roles.includes(r));

  return {
    ...state,
    hasRole,
    hasAnyRole,
  };
};
