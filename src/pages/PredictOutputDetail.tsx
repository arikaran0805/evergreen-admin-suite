/**
 * PredictOutputDetail page
 * Learner-facing page to solve a Predict the Output problem.
 */
import { useParams } from "react-router-dom";
import { usePublishedPredictOutputProblem } from "@/hooks/usePredictOutputProblems";
import PredictOutputProblemView from "@/components/predict-output/PredictOutputProblemView";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/Layout";

export default function PredictOutputDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: problem, isLoading } = usePublishedPredictOutputProblem(slug);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Layout>
    );
  }

  if (!problem) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Problem Not Found</h1>
          <p className="text-muted-foreground">This problem doesn't exist or hasn't been published yet.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-8">
        <PredictOutputProblemView
          problem={problem}
          backPath="/profile?tab=practice"
        />
      </div>
    </Layout>
  );
}
