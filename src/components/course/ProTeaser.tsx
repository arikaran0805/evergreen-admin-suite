import { Lock, StickyNote, Sparkles, Award, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePricingDrawer } from "@/contexts/PricingDrawerContext";

interface ProTeaserProps {
  className?: string;
}

const PRO_FEATURES = [
  {
    id: "notes",
    title: "Quick & Deep Notes",
    description: "Take notes directly in lessons",
    icon: StickyNote,
  },
  {
    id: "practice",
    title: "Practice & Reinforce",
    description: "Interactive quizzes and exercises",
    icon: Sparkles,
  },
  {
    id: "certificate",
    title: "Certificate of Completion",
    description: "Earn verified certificates",
    icon: Award,
  },
  {
    id: "help",
    title: "Priority Support",
    description: "Get help from instructors",
    icon: HelpCircle,
  },
];

/**
 * Teaser card shown to free learners to encourage Pro upgrade
 * Displays locked premium features with upgrade CTA
 */
export const ProTeaser = ({ className = "" }: ProTeaserProps) => {
  const { openPricingDrawer } = usePricingDrawer();

  return (
    <Card className={`border-primary/20 bg-gradient-to-br from-primary/5 to-transparent ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          Unlock Pro Features
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {PRO_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="flex items-start gap-3 p-2 rounded-md bg-muted/30 opacity-60"
              >
                <div className="p-1.5 rounded-md bg-muted/50">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">
                    {feature.title}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {feature.description}
                  </p>
                </div>
                <Lock className="h-3 w-3 text-muted-foreground/50 mt-1" />
              </div>
            );
          })}
        </div>
        
        <Button 
          className="w-full mt-4" 
          size="sm"
          onClick={() => openPricingDrawer("pro_teaser")}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Upgrade to Pro
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Start free trial · No credit card required
        </p>
      </CardContent>
    </Card>
  );
};

export default ProTeaser;
