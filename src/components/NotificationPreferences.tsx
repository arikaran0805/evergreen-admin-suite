import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, BellOff, Mail, CheckCircle, XCircle, MessageSquare, FileText, Users, Trash2, Flag, Loader2 } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Skeleton } from "@/components/ui/skeleton";

interface NotificationPreferencesProps {
  userId: string | null;
  isAdmin?: boolean;
  isModerator?: boolean;
}

export const NotificationPreferences = ({ userId, isAdmin, isModerator }: NotificationPreferencesProps) => {
  const { preferences, loading, saving, updatePreference } = useNotificationPreferences(userId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>Loading your preferences...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return null;
  }

  const PreferenceRow = ({ 
    icon: Icon, 
    label, 
    description, 
    checked, 
    onCheckedChange,
    disabled = false 
  }: { 
    icon: typeof Bell;
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-0.5">
          <Label className="text-sm font-medium cursor-pointer" htmlFor={label}>
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Switch
          id={label}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled || saving}
        />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Notification Preferences</CardTitle>
        </div>
        <CardDescription>Choose which notifications you want to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Admin-specific preferences */}
        {isAdmin && (
          <>
            <div className="pb-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Admin Notifications</h4>
            </div>
            
            <PreferenceRow
              icon={FileText}
              label="Content Submissions"
              description="When moderators submit content for approval"
              checked={preferences.content_submissions}
              onCheckedChange={(checked) => updatePreference('content_submissions', checked)}
            />
            
            <PreferenceRow
              icon={Flag}
              label="Reports"
              description="When users report content or issues"
              checked={preferences.reports}
              onCheckedChange={(checked) => updatePreference('reports', checked)}
            />
            
            <PreferenceRow
              icon={Users}
              label="New Users"
              description="When new users sign up"
              checked={preferences.new_users}
              onCheckedChange={(checked) => updatePreference('new_users', checked)}
            />
            
            <PreferenceRow
              icon={Trash2}
              label="Delete Requests"
              description="When users request content deletion"
              checked={preferences.delete_requests}
              onCheckedChange={(checked) => updatePreference('delete_requests', checked)}
            />
            
            <Separator className="my-4" />
          </>
        )}

        {/* Moderator-specific preferences */}
        {(isModerator || isAdmin) && (
          <>
            <div className="pb-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {isAdmin ? 'Moderator Notifications' : 'Your Notifications'}
              </h4>
            </div>
            
            <PreferenceRow
              icon={CheckCircle}
              label="Content Approved"
              description="When your content is approved by an admin"
              checked={preferences.content_approved}
              onCheckedChange={(checked) => updatePreference('content_approved', checked)}
            />
            
            <PreferenceRow
              icon={XCircle}
              label="Content Rejected"
              description="When your content is rejected by an admin"
              checked={preferences.content_rejected}
              onCheckedChange={(checked) => updatePreference('content_rejected', checked)}
            />
            
            <PreferenceRow
              icon={MessageSquare}
              label="Changes Requested"
              description="When an admin requests changes on your content"
              checked={preferences.changes_requested}
              onCheckedChange={(checked) => updatePreference('changes_requested', checked)}
            />
            
            <PreferenceRow
              icon={MessageSquare}
              label="Annotations"
              description="When an admin adds annotations to your content"
              checked={preferences.annotations}
              onCheckedChange={(checked) => updatePreference('annotations', checked)}
            />
            
            <Separator className="my-4" />
          </>
        )}

        {/* General preferences */}
        <div className="pb-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">General</h4>
        </div>
        
        <PreferenceRow
          icon={Mail}
          label="Email Notifications"
          description="Receive notifications via email (coming soon)"
          checked={preferences.email_notifications}
          onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
          disabled={true}
        />
        
        <div className="pt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <BellOff className="h-3.5 w-3.5" />
          <span>Disabled notifications will not appear in your notification bell</span>
        </div>
      </CardContent>
    </Card>
  );
};
