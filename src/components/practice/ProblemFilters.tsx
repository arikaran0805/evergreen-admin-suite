import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { DifficultyFilter, StatusFilter } from "./types";

interface ProblemFiltersProps {
  difficulty: DifficultyFilter;
  status: StatusFilter;
  search: string;
  onDifficultyChange: (d: DifficultyFilter) => void;
  onStatusChange: (s: StatusFilter) => void;
  onSearchChange: (s: string) => void;
}

const difficultyOptions: { value: DifficultyFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'solved', label: 'Solved' },
  { value: 'unsolved', label: 'Unsolved' },
];

export function ProblemFilters({
  difficulty,
  status,
  search,
  onDifficultyChange,
  onStatusChange,
  onSearchChange,
}: ProblemFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4 border-b border-border/50">
      {/* Difficulty Filter */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground mr-2">Difficulty:</span>
        <div className="flex gap-1">
          {difficultyOptions.map((opt) => (
            <Button
              key={opt.value}
              variant="ghost"
              size="sm"
              onClick={() => onDifficultyChange(opt.value)}
              className={cn(
                "h-8 px-3 text-sm font-normal rounded-full",
                difficulty === opt.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground mr-2">Status:</span>
        <div className="flex gap-1">
          {statusOptions.map((opt) => (
            <Button
              key={opt.value}
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange(opt.value)}
              className={cn(
                "h-8 px-3 text-sm font-normal rounded-full",
                status === opt.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-xs ml-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search problems..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 bg-muted/30 border-border/50"
        />
      </div>
    </div>
  );
}
