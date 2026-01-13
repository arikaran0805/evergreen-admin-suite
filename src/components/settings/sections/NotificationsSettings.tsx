import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, Monitor, Shield, Users, FileText, Flag, Trash2 } from "lucide-react";

interface NotificationPrefs {
  content_submissions: boolean;
  reports: boolean;
  new_users: boolean;
  delete_requests: boolean;
  content_approved: boolean;
  content_rejected: boolean;
  changes_requested: boolean;
  annotations: boolean;
  email_notifications: boolean;
}

interface NotificationsSettingsProps {
  preferences: NotificationPrefs | null;
  allNotificationsEnabled: boolean;
  onToggleAll: (enabled: boolean) => void;
  onToggleSingle: (key: string, enabled: boolean) => void;
  loading: boolean;
  isAdmin: boolean;
}

const NotificationsSettings = ({
  preferences,
  allNotificationsEnabled,
  onToggleAll,
  onToggleSingle,
  loading,
  isAdmin,
}: NotificationsSettingsProps) => {
  const adminNotifications = [
    { key: "content_submissions", label: "Content Submissions", description: "When moderators submit content for approval", icon: FileText },
    { key: "reports", label: "Reports", description: "User reports on content or comments", icon: Flag },
    { key: "new_users", label: "New Users", description: "When new users register", icon: Users },
    { key: "delete_requests", label: "Delete Requests", description: "When content deletion is requested", icon: Trash2 },
  ];

  const moderatorNotifications = [
    { key: "content_approved", label: "Content Approved", description: "When your content is approved", icon: FileText },
    { key: "content_rejected", label: "Content Rejected", description: "When your content is rejected", icon: FileText },
    { key: "changes_requested", label: "Changes Requested", description: "When changes are requested on your content", icon: FileText },
    { key: "annotations", label: "Annotations", description: "When annotations are added to your content", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F2A1D]">Notifications</h2>
        <p className="text-sm text-[#1E1E1E]/60 mt-1">
          Manage how you receive notifications
        </p>
      </div>

      {/* Master Toggle */}
      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#0F2A1D]/5 flex items-center justify-center">
                <Bell className="h-6 w-6 text-[#0F2A1D]" />
              </div>
              <div>
                <Label className="text-base font-semibold text-[#0F2A1D]">All Notifications</Label>
                <p className="text-sm text-[#1E1E1E]/50">
                  Master toggle for all notification types
                </p>
              </div>
            </div>
            <Switch
              checked={allNotificationsEnabled}
              onCheckedChange={onToggleAll}
              disabled={loading}
              className="data-[state=checked]:bg-[#0F2A1D]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Admin Notifications */}
      {isAdmin && (
        <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
            <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
              <Shield className="h-5 w-5 text-[#1E4D3A]" />
              Admin Notifications
            </CardTitle>
            <CardDescription className="text-[#1E1E1E]/50">
              Notifications for administrative events
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-[#E8EBE7]">
            {adminNotifications.map((notif) => {
              const Icon = notif.icon;
              const isEnabled = preferences?.[notif.key as keyof NotificationPrefs] ?? true;
              
              return (
                <div key={notif.key} className="flex items-center justify-between p-4 hover:bg-[#FAFBF9] transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-[#1E1E1E]/40" />
                    <div>
                      <Label className="text-sm font-medium text-[#1E1E1E]">{notif.label}</Label>
                      <p className="text-xs text-[#1E1E1E]/50">{notif.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(enabled) => onToggleSingle(notif.key, enabled)}
                    disabled={loading || !allNotificationsEnabled}
                    className="data-[state=checked]:bg-[#0F2A1D]"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Moderator Notifications */}
      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Monitor className="h-5 w-5 text-[#1E4D3A]" />
            Content Notifications
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Notifications about your content
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-[#E8EBE7]">
          {moderatorNotifications.map((notif) => {
            const Icon = notif.icon;
            const isEnabled = preferences?.[notif.key as keyof NotificationPrefs] ?? true;
            
            return (
              <div key={notif.key} className="flex items-center justify-between p-4 hover:bg-[#FAFBF9] transition-colors">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-[#1E1E1E]/40" />
                  <div>
                    <Label className="text-sm font-medium text-[#1E1E1E]">{notif.label}</Label>
                    <p className="text-xs text-[#1E1E1E]/50">{notif.description}</p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(enabled) => onToggleSingle(notif.key, enabled)}
                  disabled={loading || !allNotificationsEnabled}
                  className="data-[state=checked]:bg-[#0F2A1D]"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Email Delivery */}
      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Mail className="h-5 w-5 text-[#1E4D3A]" />
            Delivery Method
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[#1E1E1E]/40" />
              <div>
                <Label className="text-sm font-medium text-[#1E1E1E]">Email Notifications</Label>
                <p className="text-xs text-[#1E1E1E]/50">Also receive notifications via email</p>
              </div>
            </div>
            <Switch
              checked={preferences?.email_notifications ?? false}
              onCheckedChange={(enabled) => onToggleSingle("email_notifications", enabled)}
              disabled={loading}
              className="data-[state=checked]:bg-[#0F2A1D]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsSettings;
