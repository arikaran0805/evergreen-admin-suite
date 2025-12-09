import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Brain, BarChart3, Code2, Layers } from "lucide-react";

export type CareerPath = 'data-science' | 'data-engineer' | 'ml-engineer' | 'analyst' | 'full-stack';

interface CareerPathOption {
  id: CareerPath;
  label: string;
  icon: React.ElementType;
  color: string;
  relatedSlugs: string[];
}

export const careerPaths: CareerPathOption[] = [
  { 
    id: 'data-science', 
    label: 'Data Science', 
    icon: Brain,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    relatedSlugs: ['python-for-data-science', 'statistics', 'ai-ml']
  },
  { 
    id: 'data-engineer', 
    label: 'Data Engineer', 
    icon: Database,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    relatedSlugs: ['database', 'python-for-data-science']
  },
  { 
    id: 'ml-engineer', 
    label: 'ML Engineer', 
    icon: Layers,
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    relatedSlugs: ['ai-ml', 'python-for-data-science', 'statistics']
  },
  { 
    id: 'analyst', 
    label: 'Data Analyst', 
    icon: BarChart3,
    color: 'bg-green-500/10 text-green-500 border-green-500/30',
    relatedSlugs: ['statistics', 'database', 'python-for-data-science']
  },
  { 
    id: 'full-stack', 
    label: 'Full Stack', 
    icon: Code2,
    color: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
    relatedSlugs: ['database']
  },
];

interface CareerPathSelectorProps {
  selectedCareer: CareerPath;
  onCareerChange: (career: CareerPath) => void;
}

export const CareerPathSelector = ({ selectedCareer, onCareerChange }: CareerPathSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {careerPaths.map((career) => {
        const Icon = career.icon;
        const isSelected = selectedCareer === career.id;
        
        return (
          <Button
            key={career.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onCareerChange(career.id)}
            className={`gap-2 transition-all ${
              isSelected 
                ? 'shadow-md' 
                : 'hover:bg-muted'
            }`}
          >
            <Icon className="h-4 w-4" />
            {career.label}
          </Button>
        );
      })}
    </div>
  );
};

export const getCareerPath = (id: CareerPath): CareerPathOption | undefined => {
  return careerPaths.find(c => c.id === id);
};
