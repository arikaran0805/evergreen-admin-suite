import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Shield, UserCog, Users, GripVertical } from "lucide-react";
import type { UserProfile, AppRole } from "../types";

interface UserWithRole extends UserProfile {
  role: AppRole;
}

interface CanvasUserPoolSidebarProps {
  users: UserWithRole[];
  onDragStart: (user: UserWithRole, e: React.DragEvent) => void;
}

const roleConfig: Partial<Record<AppRole, { label: string; icon: typeof Shield; color: string }>> = {
  super_moderator: { label: "Super Mod", icon: Shield, color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  senior_moderator: { label: "Senior Mod", icon: UserCog, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  moderator: { label: "Moderator", icon: Users, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  admin: { label: "Admin", icon: Shield, color: "bg-red-500/10 text-red-500 border-red-500/20" },
};

const CanvasUserPoolSidebar = ({ users, onDragStart }: CanvasUserPoolSidebarProps) => {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<AppRole | "all">("all");

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const groupedUsers = {
    super_moderator: filteredUsers.filter((u) => u.role === "super_moderator"),
    senior_moderator: filteredUsers.filter((u) => u.role === "senior_moderator"),
    moderator: filteredUsers.filter((u) => u.role === "moderator"),
  };

  return (
    <div className="w-72 h-full border-l bg-card/50 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <h3 className="font-semibold text-sm text-foreground">User Pool</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="pl-9 h-9"
          />
        </div>
        {/* Role Filters */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterRole("all")}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              filterRole === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          {(["super_moderator", "senior_moderator", "moderator"] as AppRole[]).map((role) => {
            const config = roleConfig[role];
            return (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterRole === role
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* User List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {(["super_moderator", "senior_moderator", "moderator"] as AppRole[]).map((role) => {
            const roleUsers = groupedUsers[role as keyof typeof groupedUsers];
            if (filterRole !== "all" && filterRole !== role) return null;
            if (roleUsers.length === 0) return null;

            const config = roleConfig[role];
            const Icon = config.icon;

            return (
              <div key={role} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {config.label}s
                  </span>
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    {roleUsers.length}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {roleUsers.map((user) => (
                    <div
                      key={user.id}
                      draggable
                      onDragStart={(e) => onDragStart(user, e)}
                      className="flex items-center gap-2 p-2 rounded-lg bg-background border hover:border-primary/50 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group"
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-muted">
                          {user.full_name?.[0] || user.email[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.full_name || user.email.split("@")[0]}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No users found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CanvasUserPoolSidebar;
