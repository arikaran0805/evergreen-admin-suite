import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

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

interface CourseReviewDialogProps {
  children: React.ReactNode;
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
  userReview: { rating: number; review: string | null } | null;
  isEnrolled: boolean;
  isAuthenticated: boolean;
  onSubmitReview: (rating: number, review: string) => Promise<boolean>;
  onDeleteReview: () => Promise<boolean>;
}

const StarRating = ({ 
  rating, 
  onChange, 
  readonly = false,
  size = "md"
}: { 
  rating: number; 
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? '' : 'cursor-pointer hover:scale-110'} transition-transform`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hoverRating || rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const CourseReviewDialog = ({
  children,
  reviews,
  averageRating,
  reviewCount,
  userReview,
  isEnrolled,
  isAuthenticated,
  onSubmitReview,
  onDeleteReview,
}: CourseReviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(userReview?.rating || 0);
  const [review, setReview] = useState(userReview?.review || "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setSubmitting(true);
    const success = await onSubmitReview(rating, review);
    if (success) {
      setOpen(false);
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const success = await onDeleteReview();
    if (success) {
      setRating(0);
      setReview("");
    }
    setDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Course Reviews</span>
            {reviewCount > 0 && (
              <div className="flex items-center gap-1.5 text-base font-normal">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{averageRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({reviewCount} reviews)</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6">
          {/* Write Review Section */}
          {isAuthenticated && isEnrolled && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="font-semibold mb-3">
                {userReview ? "Update Your Review" : "Write a Review"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Your Rating
                  </label>
                  <StarRating rating={rating} onChange={setRating} size="lg" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Your Review (optional)
                  </label>
                  <Textarea
                    placeholder="Share your experience with this course..."
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={rating === 0 || submitting}
                  >
                    {submitting ? "Submitting..." : userReview ? "Update Review" : "Submit Review"}
                  </Button>
                  {userReview && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <div className="border rounded-lg p-4 bg-muted/30 text-center">
              <p className="text-muted-foreground">
                Sign in to write a review
              </p>
            </div>
          )}

          {isAuthenticated && !isEnrolled && (
            <div className="border rounded-lg p-4 bg-muted/30 text-center">
              <p className="text-muted-foreground">
                Enroll in this course to write a review
              </p>
            </div>
          )}

          {/* Reviews List */}
          <div className="flex-1 overflow-hidden">
            <h3 className="font-semibold mb-3">All Reviews ({reviewCount})</h3>
            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No reviews yet. Be the first to review!
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4 pr-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={r.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {r.profiles?.full_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {r.profiles?.full_name || "Anonymous"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <StarRating rating={r.rating} readonly size="sm" />
                          {r.review && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {r.review}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourseReviewDialog;
