/**
 * VerifyCertificate - Public Certificate Verification Page
 * 
 * Route: /verify/certificate/:certificateId
 * 
 * Accessible WITHOUT login for third-party verification
 * (recruiters, employers, institutions).
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ShieldCheck, ShieldX, Award, Calendar, User, BookOpen, ArrowLeft, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SEOHead from "@/components/SEOHead";

interface CertificateData {
  id: string;
  certificate_id: string;
  learner_name: string;
  course_name: string;
  issued_at: string;
  status: "pending" | "verified" | "revoked";
}

const VerifyCertificate = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchCertificate = async () => {
      if (!certificateId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("certificates")
          .select("id, certificate_id, learner_name, course_name, issued_at, status")
          .eq("certificate_id", certificateId)
          .maybeSingle();

        if (error || !data) {
          setNotFound(true);
        } else {
          setCertificate(data as CertificateData);
        }
      } catch (error) {
        console.error("Error fetching certificate:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [certificateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Verifying certificate...</div>
      </div>
    );
  }

  // If certificate is pending, show a different message
  if (certificate && certificate.status === "pending") {
    return (
      <>
        <SEOHead
          title="Certificate Pending Verification"
          description="This certificate is awaiting moderator verification."
        />
        <div className="min-h-screen bg-background">
          <div className="max-w-2xl mx-auto px-4 py-16">
            <Card className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                  <ShieldX className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Verification Pending
              </h1>
              
              <p className="text-muted-foreground mb-2">
                This certificate is awaiting moderator approval.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Once verified, this page will display the learner's credentials.
              </p>
              
              <Button asChild variant="outline">
                <Link to="/" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Go to Homepage
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (notFound || !certificate) {
    return (
      <>
        <SEOHead
          title="Certificate Not Found"
          description="The certificate you're looking for could not be found or may have been removed."
        />
        <div className="min-h-screen bg-background">
          <div className="max-w-2xl mx-auto px-4 py-16">
            <Card className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <ShieldX className="h-8 w-8 text-destructive" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Certificate Not Found
              </h1>
              
              <p className="text-muted-foreground mb-6">
                The certificate ID <code className="text-sm bg-muted px-2 py-0.5 rounded">{certificateId}</code> could not be found. 
                It may have been removed or the ID is incorrect.
              </p>
              
              <Button asChild variant="outline">
                <Link to="/" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Go to Homepage
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </>
    );
  }

  const isVerified = certificate.status === "verified";

  return (
    <>
      <SEOHead
        title={`Certificate Verification - ${certificate.learner_name}`}
        description={`Verify the authenticity of ${certificate.learner_name}'s certificate for completing ${certificate.course_name}.`}
      />
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Platform Branding */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-primary font-semibold text-lg hover:opacity-80 transition-opacity">
              <Award className="h-6 w-6" />
              Certificate Verification
            </Link>
            <p className="text-sm text-muted-foreground mt-1">
              Official certificate verification service
            </p>
          </div>

          {/* Verification Result Card */}
          <Card className="overflow-hidden">
            {/* Status Header */}
            <div className={`p-6 ${isVerified ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
              <div className="flex items-center justify-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isVerified ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                  {isVerified ? (
                    <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <ShieldX className="h-6 w-6 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div className="text-left">
                  <Badge 
                    variant={isVerified ? "default" : "destructive"}
                    className={isVerified ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {isVerified ? "Verified Certificate" : "Revoked Certificate"}
                  </Badge>
                  <p className={`text-sm mt-1 ${isVerified ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {isVerified 
                      ? "This certificate is authentic and verified" 
                      : "This certificate has been revoked"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Certificate Details */}
            <div className="p-6 space-y-6">
              {/* Learner Name */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Learner Name</p>
                  <p className="text-lg font-semibold text-foreground">{certificate.learner_name}</p>
                </div>
              </div>

              {/* Course Name */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Course Completed</p>
                  <p className="text-lg font-semibold text-foreground">{certificate.course_name}</p>
                </div>
              </div>

              {/* Completion Date */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion Date</p>
                  <p className="text-lg font-semibold text-foreground">
                    {format(new Date(certificate.issued_at), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Certificate ID */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Certificate ID
                </p>
                <code className="text-sm font-mono break-all">
                  {certificate.certificate_id}
                </code>
              </div>
            </div>

            {/* Footer */}
            <Separator />
            <div className="p-6 bg-muted/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                <p>
                  Verified by the official certification system
                </p>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/courses" className="gap-2">
                    Explore Courses
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>

          {/* Help Text */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Questions about this certificate? <Link to="/contact" className="underline hover:text-foreground">Contact us</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default VerifyCertificate;
