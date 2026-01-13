import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, Clock, Smartphone, AlertTriangle, Lock } from "lucide-react";

interface SecuritySettingsProps {
  requireEmailVerification: boolean;
  setRequireEmailVerification: (value: boolean) => void;
  allowPublicRegistration: boolean;
  setAllowPublicRegistration: (value: boolean) => void;
}

const SecuritySettings = ({
  requireEmailVerification,
  setRequireEmailVerification,
  allowPublicRegistration,
  setAllowPublicRegistration,
}: SecuritySettingsProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F2A1D]">Security</h2>
        <p className="text-sm text-[#1E1E1E]/60 mt-1">
          Protect your platform and users
        </p>
      </div>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Key className="h-5 w-5 text-[#1E4D3A]" />
            Password Policy
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Configure password requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Minimum Password Length</Label>
            <Select defaultValue="8">
              <SelectTrigger className="w-32 border-[#E8EBE7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 characters</SelectItem>
                <SelectItem value="8">8 characters</SelectItem>
                <SelectItem value="10">10 characters</SelectItem>
                <SelectItem value="12">12 characters</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-[#1E1E1E]">Password Requirements</Label>
            <div className="space-y-2">
              {[
                { label: "Require uppercase letter", defaultChecked: true },
                { label: "Require lowercase letter", defaultChecked: true },
                { label: "Require number", defaultChecked: true },
                { label: "Require special character", defaultChecked: false },
              ].map((req) => (
                <div key={req.label} className="flex items-center justify-between p-3 bg-[#FAFBF9] rounded-lg">
                  <span className="text-sm text-[#1E1E1E]">{req.label}</span>
                  <Switch
                    defaultChecked={req.defaultChecked}
                    className="data-[state=checked]:bg-[#0F2A1D]"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Clock className="h-5 w-5 text-[#1E4D3A]" />
            Session Management
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Control session timeout and security
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Session Timeout</Label>
            <Select defaultValue="24">
              <SelectTrigger className="w-48 border-[#E8EBE7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="4">4 hours</SelectItem>
                <SelectItem value="8">8 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="168">7 days</SelectItem>
                <SelectItem value="720">30 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[#1E1E1E]/40">Users will be logged out after this period of inactivity</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#FAFBF9] rounded-xl">
            <div>
              <Label className="text-sm font-medium text-[#1E1E1E]">Require re-authentication for sensitive actions</Label>
              <p className="text-xs text-[#1E1E1E]/50">Prompt for password when changing critical settings</p>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#0F2A1D]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Smartphone className="h-5 w-5 text-[#1E4D3A]" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Add an extra layer of security
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 border border-[#E8EBE7] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0F2A1D]/5 flex items-center justify-center">
                <Lock className="h-5 w-5 text-[#0F2A1D]" />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#1E1E1E]">Require 2FA for Admins</Label>
                <p className="text-xs text-[#1E1E1E]/50">All admin accounts must enable 2FA</p>
              </div>
            </div>
            <Switch
              defaultChecked={false}
              className="data-[state=checked]:bg-[#0F2A1D]"
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-[#E8EBE7] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0F2A1D]/5 flex items-center justify-center">
                <Lock className="h-5 w-5 text-[#0F2A1D]" />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#1E1E1E]">Require 2FA for Moderators</Label>
                <p className="text-xs text-[#1E1E1E]/50">All moderator accounts must enable 2FA</p>
              </div>
            </div>
            <Switch
              defaultChecked={false}
              className="data-[state=checked]:bg-[#0F2A1D]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <AlertTriangle className="h-5 w-5 text-[#1E4D3A]" />
            Login Alerts
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Get notified about suspicious login activity
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#FAFBF9] rounded-xl">
            <div>
              <Label className="text-sm font-medium text-[#1E1E1E]">New Device Login</Label>
              <p className="text-xs text-[#1E1E1E]/50">Alert when logging in from a new device</p>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#0F2A1D]"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#FAFBF9] rounded-xl">
            <div>
              <Label className="text-sm font-medium text-[#1E1E1E]">New Location Login</Label>
              <p className="text-xs text-[#1E1E1E]/50">Alert when logging in from a new location</p>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#0F2A1D]"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#FAFBF9] rounded-xl">
            <div>
              <Label className="text-sm font-medium text-[#1E1E1E]">Failed Login Attempts</Label>
              <p className="text-xs text-[#1E1E1E]/50">Alert after multiple failed login attempts</p>
            </div>
            <Switch
              defaultChecked={true}
              className="data-[state=checked]:bg-[#0F2A1D]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;
