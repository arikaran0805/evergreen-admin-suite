import { cn } from "@/lib/utils";
import {
  Settings,
  Palette,
  Mail,
  Bell,
  Search,
  Shield,
  Plug,
  Cog,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type SettingsSection = 
  | "general" 
  | "branding" 
  | "email" 
  | "notifications" 
  | "seo" 
  | "security" 
  | "integrations" 
  | "advanced";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  isAdmin: boolean;
  isSeniorModerator?: boolean;
}

const settingsItems: {
  id: SettingsSection;
  label: string;
  icon: typeof Settings;
  adminOnly?: boolean;
  seniorModeratorAllowed?: boolean;
  isAdvanced?: boolean;
  tooltip?: string;
}[] = [
  { id: "general", label: "General", icon: Settings, seniorModeratorAllowed: true },
  { id: "branding", label: "Branding", icon: Palette, seniorModeratorAllowed: true },
  { id: "email", label: "Email", icon: Mail, adminOnly: true },
  { id: "notifications", label: "Notifications", icon: Bell, seniorModeratorAllowed: true },
  { id: "seo", label: "SEO", icon: Search, seniorModeratorAllowed: true },
  { id: "security", label: "Security", icon: Shield, adminOnly: true },
  { id: "integrations", label: "Integrations", icon: Plug, adminOnly: true },
  { 
    id: "advanced", 
    label: "Advanced", 
    icon: Cog, 
    adminOnly: true, 
    isAdvanced: true,
    tooltip: "Advanced system-level settings"
  },
];

const SettingsSidebar = ({
  activeSection,
  onSectionChange,
  isAdmin,
  isSeniorModerator = false,
}: SettingsSidebarProps) => {
  const filteredItems = settingsItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (!isAdmin && !item.seniorModeratorAllowed) return false;
    return true;
  });

  const mainItems = filteredItems.filter((item) => !item.isAdvanced);
  const advancedItems = filteredItems.filter((item) => item.isAdvanced);

  const renderItem = (item: typeof settingsItems[0]) => {
    const isActive = activeSection === item.id;
    const Icon = item.icon;

    const button = (
      <button
        onClick={() => onSectionChange(item.id)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative group",
          isActive
            ? "text-[#0F2A1D] bg-white shadow-sm"
            : "text-[#1E1E1E]/70 hover:text-[#0F2A1D] hover:bg-white/50",
          item.isAdvanced && !isActive && "text-[#1E1E1E]/50"
        )}
      >
        {/* Active indicator line */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#0F2A1D] rounded-r-full" />
        )}
        <Icon className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          isActive ? "text-[#0F2A1D]" : "text-[#1E1E1E]/40 group-hover:text-[#1E1E1E]/70"
        )} />
        <span>{item.label}</span>
      </button>
    );

    if (item.tooltip) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="bg-[#0F2A1D] text-white">
            {item.tooltip}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.id}>{button}</div>;
  };

  return (
    <aside className="w-56 shrink-0 bg-[#FAFBF9] border-r border-[#E8EBE7] h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-[#E8EBE7]">
        <h2 className="text-lg font-semibold text-[#0F2A1D] flex items-center gap-2">
          <Settings className="h-5 w-5 text-[#1E4D3A]" />
          Settings
        </h2>
        <p className="text-xs text-[#1E1E1E]/50 mt-1">
          {isAdmin ? "Full access" : "Limited access"}
        </p>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {mainItems.map(renderItem)}
      </nav>

      {/* Advanced section - pinned at bottom */}
      {advancedItems.length > 0 && (
        <div className="p-3 border-t border-[#E8EBE7] mt-auto">
          {advancedItems.map(renderItem)}
        </div>
      )}
    </aside>
  );
};

export default SettingsSidebar;
