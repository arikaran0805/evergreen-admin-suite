/**
 * EngagementCard - Post-completion engagement actions
 * 
 * Optional actions: rate course, leave review, view notes.
 * Kept lightweight and non-blocking.
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import CourseReviewDialog from "@/components/CourseReviewDialog";

interface Review {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface EngagementCardProps {
  courseId: string;
  courseSlug: string;
  hasExistingReview: boolean;
  onViewNotes: () => void;
  reviews: Review[];
  averageRating: number;
  userReview: Review | null;
  onSubmitReview: (rating: number, review: string) => Promise<boolean>;
  onDeleteReview: () => Promise<boolean>;
}

const EngagementCard = ({
  courseId,
  courseSlug,
  hasExistingReview,
  onViewNotes,
  reviews,
  averageRating,
  userReview,
  onSubmitReview,
  onDeleteReview,
}: EngagementCardProps) => {
  const [hoveredStar, setHoveredStar] = useState(0);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">How was your experience?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Your feedback helps improve this course for others
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
        {/* Quick Star Rating Preview */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Rate this course</p>
          <CourseReviewDialog
            reviews={reviews}
            averageRating={averageRating}
            reviewCount={reviews.length}
            userReview={userReview}
            isEnrolled={true}
            isAuthenticated={true}
            onSubmitReview={onSubmitReview}
            onDeleteReview={onDeleteReview}
          >
            <div className="flex gap-1 cursor-pointer">
              {[1, 2, 3, 4, 5].map((star) => (
                <div
                  key={star}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition-colors",
                      hoveredStar >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/40"
                    )}
                  />
                </div>
              ))}
            </div>
          </CourseReviewDialog>
        </div>

        <div className="hidden sm:block h-12 w-px bg-border" />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <CourseReviewDialog
            reviews={reviews}
            averageRating={averageRating}
            reviewCount={reviews.length}
            userReview={userReview}
            isEnrolled={true}
            isAuthenticated={true}
            onSubmitReview={onSubmitReview}
            onDeleteReview={onDeleteReview}
          >
            <Button variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {hasExistingReview ? 'Update Review' : 'Leave a Review'}
            </Button>
          </CourseReviewDialog>
          
          <Button 
            variant="ghost" 
            onClick={onViewNotes}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            View My Notes
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EngagementCard;
