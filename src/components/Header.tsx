import { Link } from "react-router-dom";
import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Header = () => {
  const categories = ["Technology", "Lifestyle", "Business", "Education", "Health"];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow transition-transform group-hover:scale-105">
            <span className="text-xl font-bold text-primary-foreground">B</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent hidden sm:inline">
            BlogHub
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {categories.map((category) => (
            <Link
              key={category}
              to={`/category/${category.toLowerCase()}`}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              {category}
            </Link>
          ))}
        </nav>

        {/* Search and Mobile Menu */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hover:bg-secondary">
            <Search className="h-5 w-5" />
          </Button>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <nav className="flex flex-col gap-4 mt-8">
                {categories.map((category) => (
                  <Link
                    key={category}
                    to={`/category/${category.toLowerCase()}`}
                    className="text-base font-medium text-foreground/80 hover:text-primary transition-colors py-2"
                  >
                    {category}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
