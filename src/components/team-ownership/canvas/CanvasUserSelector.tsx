import { useState } from "react";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UserProfile, AppRole } from "../types";

interface UserWithRole extends UserProfile {
  role: AppRole;
}

interface CanvasUserSelectorProps {
  users: UserWithRole[];
  excludeUserIds: string[];
  targetRole: "super_moderator" | "senior_moderator" | "moderator";
  onSelect: (user: UserWithRole) => void;
  onClose: () => void;
}

const roleLabels = {
  super_moderator: "Super Moderator",
  senior_moderator: "Senior Moderator",
  moderator: "Moderator",
};

const CanvasUserSelector = ({
  users,
  excludeUserIds,
  targetRole,
  onSelect,
  onClose,
}: CanvasUserSelectorProps) => {
  const [search, setSearch] = useState("");

  // Filter users by role and search term
  const availableUsers = users.filter((user) => {
    if (excludeUserIds.includes(user.id)) return false;
    if (user.role !== targetRole) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold text-foreground">Assign {roleLabels[targetRole]}</h2>
            <p className="text-xs text-muted-foreground">Select a user to assign</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* User List */}
        <ScrollArea className="max-h-[50vh]">
          <div className="p-2 space-y-1">
            {availableUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">
                  {search ? "No matching users found" : `No ${roleLabels[targetRole]}s available`}
                </p>
              </div>
            ) : (
              availableUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onSelect(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-sm bg-muted">
                      {user.full_name?.[0] || user.email[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {user.full_name || user.email.split("@")[0]}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default CanvasUserSelector;
