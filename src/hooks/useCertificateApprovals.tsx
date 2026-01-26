import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type CertificateStatus = "pending" | "verified" | "revoked";

export interface CertificateWithDetails {
  id: string;
  certificate_id: string;
  user_id: string;
  course_id: string;
  course_name: string;
  learner_name: string;
  issued_at: string;
  created_at: string;
  status: CertificateStatus;
  approved_by: string | null;
  approved_at: string | null;
  // Joined data
  learner_email?: string;
  lessons_completed?: number;
  total_lessons?: number;
}

interface CertificateStats {
  pending: number;
  verified: number;
  revoked: number;
}

interface UseCertificateApprovalsOptions {
  statusFilter?: CertificateStatus | "all";
  courseFilter?: string;
  searchQuery?: string;
}

export const useCertificateApprovals = (options: UseCertificateApprovalsOptions = {}) => {
  const { statusFilter = "all", courseFilter, searchQuery } = options;
  
  const [certificates, setCertificates] = useState<CertificateWithDetails[]>([]);
  const [stats, setStats] = useState<CertificateStats>({ pending: 0, verified: 0, revoked: 0 });
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      const [pendingResult, verifiedResult, revokedResult] = await Promise.all([
        supabase.from("certificates").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("certificates").select("*", { count: "exact", head: true }).eq("status", "verified"),
        supabase.from("certificates").select("*", { count: "exact", head: true }).eq("status", "revoked"),
      ]);

      setStats({
        pending: pendingResult.count || 0,
        verified: verifiedResult.count || 0,
        revoked: revokedResult.count || 0,
      });
    } catch (err) {
      console.error("Error fetching certificate stats:", err);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("courses")
        .select("id, name")
        .order("name");
      setCourses(data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  }, []);

  const fetchCertificates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("certificates")
        .select(`
          id,
          certificate_id,
          user_id,
          course_id,
          course_name,
          learner_name,
          issued_at,
          created_at,
          status,
          approved_by,
          approved_at
        `)
        .order("created_at", { ascending: false });

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply course filter
      if (courseFilter) {
        query = query.eq("course_id", courseFilter);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`learner_name.ilike.%${searchQuery}%,certificate_id.ilike.%${searchQuery}%`);
      }

      const { data: certificatesData, error: certError } = await query;

      if (certError) throw certError;

      // Fetch additional user and lesson data
      const enrichedCertificates = await Promise.all(
        (certificatesData || []).map(async (cert) => {
          // Get user email
          const { data: profileData } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", cert.user_id)
            .maybeSingle();

          // Get lesson progress
          const { data: lessonsData } = await supabase
            .from("course_lessons")
            .select("id")
            .eq("course_id", cert.course_id)
            .is("deleted_at", null);

          const { count: completedCount } = await supabase
            .from("lesson_progress")
            .select("*", { count: "exact", head: true })
            .eq("user_id", cert.user_id)
            .eq("course_id", cert.course_id)
            .eq("completed", true);

          return {
            ...cert,
            learner_email: profileData?.email || "",
            lessons_completed: completedCount || 0,
            total_lessons: lessonsData?.length || 0,
          } as CertificateWithDetails;
        })
      );

      setCertificates(enrichedCertificates);
    } catch (err: any) {
      console.error("Error fetching certificates:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, courseFilter, searchQuery]);

  const approveCertificate = useCallback(async (certificateId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("certificates")
        .update({
          status: "verified",
          approved_by: session.user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", certificateId);

      if (error) throw error;

      toast({
        title: "Certificate Approved",
        description: "The certificate is now publicly verifiable.",
      });

      // Refresh data
      await Promise.all([fetchCertificates(), fetchStats()]);
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  }, [fetchCertificates, fetchStats, toast]);

  const rejectCertificate = useCallback(async (certificateId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("certificates")
        .update({
          status: "revoked",
          approved_by: session.user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", certificateId);

      if (error) throw error;

      toast({
        title: "Certificate Rejected",
        description: "The certificate has been marked as revoked.",
      });

      // Refresh data
      await Promise.all([fetchCertificates(), fetchStats()]);
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  }, [fetchCertificates, fetchStats, toast]);

  useEffect(() => {
    fetchStats();
    fetchCourses();
  }, [fetchStats, fetchCourses]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  return {
    certificates,
    stats,
    courses,
    isLoading,
    error,
    refetch: fetchCertificates,
    approveCertificate,
    rejectCertificate,
  };
};
