/**
 * CertificateCard - Certificate preview and download section
 * 
 * Displays a certificate preview with learner name and course name.
 * Provides download, LinkedIn share, and verification options.
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Linkedin, ShieldCheck, Award, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface CertificateCardProps {
  learnerName: string;
  courseName: string;
  completionDate: Date;
  courseId: string;
}

const CertificateCard = ({
  learnerName,
  courseName,
  completionDate,
  courseId,
}: CertificateCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [certificateStatus, setCertificateStatus] = useState<"pending" | "verified" | "revoked">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const certificateRef = useRef<HTMLDivElement>(null);

  // Generate or fetch certificate on mount
  useEffect(() => {
    const ensureCertificate = async () => {
      if (!user || !courseId) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if certificate already exists
        const { data: existing } = await supabase
          .from("certificates")
          .select("certificate_id, status")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .maybeSingle();

        if (existing) {
          setCertificateId(existing.certificate_id);
          setCertificateStatus(existing.status as "pending" | "verified" | "revoked");
          setIsLoading(false);
          return;
        }

        // Generate new certificate ID
        const newCertId = `CERT-${courseId.slice(0, 8).toUpperCase()}-${user.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

        // Insert new certificate with PENDING status (not auto-verified)
        const { error } = await supabase
          .from("certificates")
          .insert({
            user_id: user.id,
            course_id: courseId,
            certificate_id: newCertId,
            learner_name: learnerName,
            course_name: courseName,
            issued_at: completionDate.toISOString(),
            status: "pending", // Always start as pending, requires moderator approval
          });

        if (error) {
          console.error("Error creating certificate:", error);
          setIsLoading(false);
          return;
        }

        setCertificateId(newCertId);
        setCertificateStatus("pending");
      } catch (error) {
        console.error("Error ensuring certificate:", error);
      } finally {
        setIsLoading(false);
      }
    };

    ensureCertificate();
  }, [user, courseId, learnerName, courseName, completionDate]);

  const isVerified = certificateStatus === "verified";

  const handleDownload = async () => {
    setDownloading(true);
    
    try {
      // Create a canvas to render the certificate
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set certificate dimensions (A4 landscape ratio)
      canvas.width = 1200;
      canvas.height = 850;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#f0fdf4');
      gradient.addColorStop(1, '#dcfce7');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Border
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 8;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      // Inner decorative border
      ctx.strokeStyle = '#bbf7d0';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

      // Certificate title
      ctx.fillStyle = '#166534';
      ctx.font = 'bold 48px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Certificate of Completion', canvas.width / 2, 150);

      // Award icon placeholder (decorative line)
      ctx.beginPath();
      ctx.arc(canvas.width / 2, 220, 40, 0, Math.PI * 2);
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Award text
      ctx.font = 'bold 32px Georgia, serif';
      ctx.fillStyle = '#16a34a';
      ctx.fillText('★', canvas.width / 2, 232);

      // "This is to certify that"
      ctx.fillStyle = '#374151';
      ctx.font = '24px Georgia, serif';
      ctx.fillText('This is to certify that', canvas.width / 2, 310);

      // Learner name
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 44px Georgia, serif';
      ctx.fillText(learnerName || 'Learner', canvas.width / 2, 380);

      // "has successfully completed"
      ctx.fillStyle = '#374151';
      ctx.font = '24px Georgia, serif';
      ctx.fillText('has successfully completed the course', canvas.width / 2, 450);

      // Course name
      ctx.fillStyle = '#166534';
      ctx.font = 'bold 36px Georgia, serif';
      // Wrap long course names
      const maxWidth = canvas.width - 200;
      const words = courseName.split(' ');
      let line = '';
      let y = 520;
      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line.trim(), canvas.width / 2, y);
          line = word + ' ';
          y += 45;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), canvas.width / 2, y);

      // Completion date
      ctx.fillStyle = '#6b7280';
      ctx.font = '20px Georgia, serif';
      ctx.fillText(
        `Completed on ${format(completionDate, 'MMMM d, yyyy')}`,
        canvas.width / 2,
        y + 80
      );

      // Certificate ID
      if (certificateId) {
        ctx.font = '14px monospace';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(`Certificate ID: ${certificateId}`, canvas.width / 2, canvas.height - 60);
      }

      // Decorative corners
      const cornerSize = 40;
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 3;
      
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(70, 110);
      ctx.lineTo(70, 70);
      ctx.lineTo(110, 70);
      ctx.stroke();
      
      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(canvas.width - 110, 70);
      ctx.lineTo(canvas.width - 70, 70);
      ctx.lineTo(canvas.width - 70, 110);
      ctx.stroke();
      
      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(70, canvas.height - 110);
      ctx.lineTo(70, canvas.height - 70);
      ctx.lineTo(110, canvas.height - 70);
      ctx.stroke();
      
      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(canvas.width - 110, canvas.height - 70);
      ctx.lineTo(canvas.width - 70, canvas.height - 70);
      ctx.lineTo(canvas.width - 70, canvas.height - 110);
      ctx.stroke();

      // Download as PNG
      const link = document.createElement('a');
      link.download = `${courseName.replace(/[^a-z0-9]/gi, '-')}-certificate.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating certificate:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleShareLinkedIn = () => {
    const text = encodeURIComponent(
      `I just completed "${courseName}"! 🎉\n\nExcited to share my new skills and knowledge. #Learning #Achievement`
    );
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const handleVerify = () => {
    if (certificateId) {
      // Navigate to public verification page
      navigate(`/verify/certificate/${certificateId}`);
    } else {
      toast({
        title: "Certificate not ready",
        description: "Please wait while your certificate is being generated.",
      });
    }
  };

  return (
    <Card className="p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-center lg:items-start">
        {/* Certificate Preview */}
        <div 
          ref={certificateRef}
          className="w-full max-w-md aspect-[1.4/1] rounded-lg border-4 border-primary/20 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden"
        >
          {/* Decorative border */}
          <div className="absolute inset-3 border-2 border-primary/30 rounded pointer-events-none" />
          
          {/* Award icon */}
          <div className="mb-3">
            <Award className="h-12 w-12 text-primary" />
          </div>
          
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Certificate of Completion
          </p>
          
          <p className="text-sm text-muted-foreground mb-1">
            This is to certify that
          </p>
          
          <p className="text-lg font-bold text-foreground mb-2 line-clamp-1">
            {learnerName || 'Learner'}
          </p>
          
          <p className="text-xs text-muted-foreground mb-1">
            has successfully completed
          </p>
          
          <p className="text-sm font-semibold text-primary line-clamp-2 mb-3">
            {courseName}
          </p>
          
          <p className="text-xs text-muted-foreground">
            {format(completionDate, 'MMMM d, yyyy')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4 flex-1">
          <div>
            <h3 className="text-lg font-semibold mb-1">Your Certificate</h3>
            <p className="text-sm text-muted-foreground">
              Congratulations on completing this course! Download your certificate or share your achievement.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Primary CTA */}
            <Button 
              onClick={handleDownload} 
              disabled={downloading}
              className="w-full sm:w-auto"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? 'Generating...' : 'Download Certificate'}
            </Button>

            {/* Secondary actions */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                onClick={handleShareLinkedIn}
                className="flex-1 sm:flex-none"
              >
                <Linkedin className="h-4 w-4 mr-2" />
                Share on LinkedIn
              </Button>
              
              {/* Verification CTA - Different UI based on status */}
              {isLoading ? (
                <div className="flex items-center gap-2 px-4 py-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : isVerified ? (
                // STATE 2: VERIFIED - Show Verify Certificate CTA
                <div className="flex flex-col gap-1">
                  <Button 
                    variant="ghost" 
                    onClick={handleVerify}
                    className="flex-1 sm:flex-none"
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Verify Certificate
                  </Button>
                  <p className="text-xs text-muted-foreground text-center sm:text-left">
                    Allows employers to verify this certificate
                  </p>
                </div>
              ) : (
                // STATE 1: PENDING - Show Verification Pending status
                <div className="flex flex-col gap-1 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Verification Pending
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting moderator approval
                  </p>
                </div>
              )}
            </div>
            
            {/* Trust reinforcement text - Different based on status */}
            <p className="text-xs text-muted-foreground mt-3">
              {isVerified 
                ? "This certificate is verifiable and shareable"
                : "This certificate will be verifiable once approved"
              }
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CertificateCard;
