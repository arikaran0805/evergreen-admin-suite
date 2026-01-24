import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Tag, Search, X, Hash, TrendingUp, SortAsc, Grid3X3, List, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface TagWithCount {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

type SortOption = "popular" | "alphabetical" | "recent";
type ViewMode = "grid" | "list";

const Tags = () => {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  
  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      // Get all approved tags
      const { data: tagsData, error: tagsError } = await supabase
        .from("tags")
        .select("id, name, slug")
        .eq("status", "approved")
        .order("name");

      if (tagsError) throw tagsError;

      // Get post counts for each tag
      const { data: postTagsData, error: postTagsError } = await supabase
        .from("post_tags")
        .select("tag_id");

      if (postTagsError) throw postTagsError;

      // Count posts per tag
      const tagCounts = new Map<string, number>();
      postTagsData?.forEach(pt => {
        const count = tagCounts.get(pt.tag_id) || 0;
        tagCounts.set(pt.tag_id, count + 1);
      });

      // Combine tags with counts
      const tagsWithCounts: TagWithCount[] = (tagsData || []).map(tag => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        postCount: tagCounts.get(tag.id) || 0
      }));

      setTags(tagsWithCounts);
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort tags
  const filteredTags = useMemo(() => {
    let result = [...tags];

    // Search filter (using debounced value)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(tag => tag.name.toLowerCase().includes(query));
    }

    // Letter filter
    if (selectedLetter) {
      result = result.filter(tag => 
        tag.name.toUpperCase().startsWith(selectedLetter)
      );
    }

    // Sort
    switch (sortBy) {
      case "popular":
        result.sort((a, b) => b.postCount - a.postCount);
        break;
      case "alphabetical":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "recent":
        // Keep original order (by created_at desc would need additional fetch)
        break;
    }

    return result;
  }, [tags, debouncedSearchQuery, selectedLetter, sortBy]);

  // Get letters that have tags
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    tags.forEach(tag => {
      const firstLetter = tag.name.charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstLetter)) {
        letters.add(firstLetter);
      }
    });
    return letters;
  }, [tags]);

  // Stats - total and filtered
  const totalTags = tags.length;
  const totalPosts = tags.reduce((sum, tag) => sum + tag.postCount, 0);
  const filteredPostCount = filteredTags.reduce((sum, tag) => sum + tag.postCount, 0);
  const isFiltered = debouncedSearchQuery || selectedLetter;

  const getTagSize = (postCount: number) => {
    const maxCount = Math.max(...tags.map(t => t.postCount), 1);
    const ratio = postCount / maxCount;
    if (ratio > 0.7) return "text-xl font-semibold";
    if (ratio > 0.4) return "text-base font-medium";
    return "text-sm";
  };

  return (
    <Layout>
      <SEOHead 
        title="Browse All Tags"
        description={`Explore ${totalTags} tags across ${totalPosts} lessons. Find topics that interest you.`}
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container px-4 py-8 md:py-12">
          <div className="max-w-5xl mx-auto">
            {/* Back Navigation */}
            <Button
              variant="ghost"
              size="sm"
              className="mb-6 gap-2 text-muted-foreground hover:text-foreground -ml-2"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {/* Header */}
            <header className="mb-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Hash className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                    Browse All Tags
                  </h1>
                  <p className="text-muted-foreground">
                    Discover topics and find lessons that match your interests
                  </p>
                </div>
              </div>

              {/* Stats */}
              {!loading && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4" />
                    {isFiltered ? (
                      <>
                        <span className="font-medium text-foreground">{filteredTags.length}</span> of {totalTags} tag{totalTags !== 1 ? "s" : ""}
                      </>
                    ) : (
                      <>{totalTags} tag{totalTags !== 1 ? "s" : ""}</>
                    )}
                  </span>
                  <span className="text-border">•</span>
                  <span>
                    {isFiltered ? (
                      <>
                        <span className="font-medium text-foreground">{filteredPostCount}</span> of {totalPosts} lesson{totalPosts !== 1 ? "s" : ""} tagged
                      </>
                    ) : (
                      <>{totalPosts} lesson{totalPosts !== 1 ? "s" : ""} tagged</>
                    )}
                  </span>
                </div>
              )}
            </header>

            {/* Search and Controls */}
            <div className="space-y-4 mb-8">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-11"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Controls Row */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Sort Options */}
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortBy("popular")}
                    className={cn(
                      "h-8 px-3 text-sm gap-1.5",
                      sortBy === "popular"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    Popular
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortBy("alphabetical")}
                    className={cn(
                      "h-8 px-3 text-sm gap-1.5",
                      sortBy === "alphabetical"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <SortAsc className="h-3.5 w-3.5" />
                    A-Z
                  </Button>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "h-8 w-8",
                      viewMode === "grid"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "h-8 w-8",
                      viewMode === "list"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Alphabet Filter */}
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLetter(null)}
                  className={cn(
                    "h-8 w-8 p-0 text-xs",
                    selectedLetter === null
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </Button>
                {alphabet.map((letter) => {
                  const hasItems = availableLetters.has(letter);
                  return (
                    <Button
                      key={letter}
                      variant="ghost"
                      size="sm"
                      onClick={() => hasItems && setSelectedLetter(letter === selectedLetter ? null : letter)}
                      disabled={!hasItems}
                      className={cn(
                        "h-8 w-8 p-0 text-xs",
                        selectedLetter === letter
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : hasItems
                            ? "text-muted-foreground hover:text-foreground"
                            : "text-muted-foreground/30 cursor-not-allowed"
                      )}
                    >
                      {letter}
                    </Button>
                  );
                })}
              </div>

              {/* Active Filters Indicator */}
              {(searchQuery || selectedLetter) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Showing <span className="font-medium text-foreground">{filteredTags.length}</span> of {tags.length} tags
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedLetter(null);
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(12)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredTags.length === 0 && (
              <div className="text-center py-16">
                <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Tag className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery || selectedLetter ? "No tags found" : "No tags yet"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || selectedLetter 
                    ? "Try adjusting your search or filters" 
                    : "Tags will appear here once content is added"}
                </p>
                {(searchQuery || selectedLetter) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedLetter(null);
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {/* Grid View */}
            {!loading && filteredTags.length > 0 && viewMode === "grid" && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredTags.map((tag) => (
                  <Link key={tag.id} to={`/tag/${tag.slug}`}>
                    <Card className="p-4 h-full hover:shadow-md hover:border-primary/30 transition-all group">
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Tag className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <Badge variant="secondary" className="text-xs">
                            {tag.postCount}
                          </Badge>
                        </div>
                        <h3 className={cn(
                          "text-foreground group-hover:text-primary transition-colors line-clamp-2",
                          getTagSize(tag.postCount)
                        )}>
                          {tag.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-auto pt-2">
                          {tag.postCount} lesson{tag.postCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* List View */}
            {!loading && filteredTags.length > 0 && viewMode === "list" && (
              <div className="space-y-2">
                {filteredTags.map((tag) => (
                  <Link key={tag.id} to={`/tag/${tag.slug}`}>
                    <Card className="p-4 hover:shadow-md hover:border-primary/30 transition-all group">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                            <Tag className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                              {tag.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {tag.postCount} lesson{tag.postCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">
                          {tag.postCount}
                        </Badge>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Popular Tags Cloud (shown when no filters are active) */}
            {!loading && !searchQuery && !selectedLetter && tags.length > 0 && (
              <section className="mt-12 pt-8 border-t border-border">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Tag Cloud
                </h2>
                <div className="flex flex-wrap gap-2">
                  {tags
                    .sort((a, b) => b.postCount - a.postCount)
                    .slice(0, 30)
                    .map((tag) => (
                      <Link key={tag.id} to={`/tag/${tag.slug}`}>
                        <Badge
                          variant="outline"
                          className={cn(
                            "hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all cursor-pointer",
                            getTagSize(tag.postCount)
                          )}
                        >
                          {tag.name}
                        </Badge>
                      </Link>
                    ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Tags;
