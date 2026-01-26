/**
 * Auth Page - Legacy Route Fallback
 * 
 * This page redirects users to the new /login route.
 * Kept for backwards compatibility with old links.
 */

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Preserve any query parameters during redirect
    const reason = searchParams.get("reason");
    const queryString = reason ? `?reason=${reason}` : "";
    navigate(`/login${queryString}`, { replace: true });
  }, [navigate, searchParams]);

  // Show nothing while redirecting
  return null;
};

export default Auth;
