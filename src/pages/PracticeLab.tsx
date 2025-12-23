import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Code2, Database, Terminal, Lock, Rocket, Sparkles } from "lucide-react";

const labCategories = [
  {
    id: "python",
    name: "Python Labs",
    description: "Practice Python programming with hands-on exercises",
    icon: Code2,
    count: 0,
    color: "from-blue-500 to-blue-600",
    status: "coming-soon",
  },
  {
    id: "sql",
    name: "SQL Labs",
    description: "Master database queries with interactive SQL challenges",
    icon: Database,
    count: 0,
    color: "from-green-500 to-green-600",
    status: "coming-soon",
  },
  {
    id: "cli",
    name: "Command Line Labs",
    description: "Learn terminal commands and shell scripting",
    icon: Terminal,
    count: 0,
    color: "from-purple-500 to-purple-600",
    status: "coming-soon",
  },
  {
    id: "projects",
    name: "Mini Projects",
    description: "Build real-world projects to solidify your skills",
    icon: Rocket,
    count: 0,
    color: "from-orange-500 to-orange-600",
    status: "coming-soon",
  },
];

const PracticeLab = () => {
  return (
    <Layout>
      <SEOHead
        title="Practice Lab | Hands-on Coding Practice"
        description="Practice your coding skills with interactive labs, challenges, and mini projects."
      />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4">
            <FlaskConical className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Practice Lab</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Reinforce your learning with hands-on coding exercises, SQL challenges, and real-world projects.
          </p>
        </div>

        {/* Coming Soon Banner */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="font-semibold text-lg">Practice Labs Coming Soon!</h3>
              <p className="text-muted-foreground text-sm">
                We're building interactive coding environments where you can practice what you learn. Stay tuned!
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              In Development
            </Badge>
          </CardContent>
        </Card>

        {/* Lab Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {labCategories.map((category) => {
            const Icon = category.icon;
            
            return (
              <Card 
                key={category.id} 
                className="overflow-hidden opacity-75 hover:opacity-100 transition-opacity"
              >
                <div className={`h-2 bg-gradient-to-r ${category.color}`} />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Coming Soon
                    </Badge>
                  </div>
                  <CardTitle className="mt-3">{category.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    {category.description}
                  </p>
                  <Button variant="outline" disabled className="w-full">
                    <Lock className="h-4 w-4 mr-2" />
                    Available Soon
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Preview */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6 text-center">What to Expect</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: "Browser-based IDE", desc: "Code directly in your browser" },
              { title: "Auto-grading", desc: "Instant feedback on your solutions" },
              { title: "Progress Tracking", desc: "Track your practice streak" },
            ].map((feature, i) => (
              <Card key={i} className="text-center p-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-primary">{i + 1}</span>
                </div>
                <h4 className="font-semibold mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PracticeLab;
