import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, Server, CheckCircle } from "lucide-react";
import { useState } from "react";

interface EmailSettingsProps {
  adminEmail: string;
  setAdminEmail: (value: string) => void;
  emailNotifications: boolean;
  setEmailNotifications: (value: boolean) => void;
}

const EmailSettings = ({
  adminEmail,
  setAdminEmail,
  emailNotifications,
  setEmailNotifications,
}: EmailSettingsProps) => {
  const [testingSend, setTestingSend] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const handleTestEmail = async () => {
    setTestingSend(true);
    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setTestingSend(false);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F2A1D]">Email Configuration</h2>
        <p className="text-sm text-[#1E1E1E]/60 mt-1">
          Configure email delivery and notifications
        </p>
      </div>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Server className="h-5 w-5 text-[#1E4D3A]" />
            Email Provider
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Configure your email delivery service
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Email Provider</Label>
            <Select defaultValue="default">
              <SelectTrigger className="border-[#E8EBE7] focus:ring-[#1E4D3A]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Built-in)</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
                <SelectItem value="mailgun">Mailgun</SelectItem>
                <SelectItem value="ses">Amazon SES</SelectItem>
                <SelectItem value="smtp">Custom SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#1E1E1E]">SMTP Host</Label>
              <Input
                placeholder="smtp.example.com"
                disabled
                className="border-[#E8EBE7] bg-[#FAFBF9]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1E1E1E]">SMTP Port</Label>
              <Input
                placeholder="587"
                disabled
                className="border-[#E8EBE7] bg-[#FAFBF9]"
              />
            </div>
          </div>

          <p className="text-xs text-[#1E1E1E]/40">
            Using the default provider. Select a different provider to configure custom SMTP settings.
          </p>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Mail className="h-5 w-5 text-[#1E4D3A]" />
            Sender Configuration
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Configure the "From" details for outgoing emails
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Sender Name</Label>
            <Input
              placeholder="UnlockMemory"
              defaultValue="UnlockMemory"
              className="border-[#E8EBE7] focus:border-[#1E4D3A] focus:ring-[#1E4D3A]/20"
            />
            <p className="text-xs text-[#1E1E1E]/40">
              The name that appears as the sender
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Sender Email</Label>
            <Input
              type="email"
              placeholder="noreply@unlockmemory.com"
              defaultValue="noreply@unlockmemory.com"
              className="border-[#E8EBE7] focus:border-[#1E4D3A] focus:ring-[#1E4D3A]/20"
            />
            <p className="text-xs text-[#1E1E1E]/40">
              The email address that appears as the sender
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Admin Email</Label>
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@unlockmemory.com"
              className="border-[#E8EBE7] focus:border-[#1E4D3A] focus:ring-[#1E4D3A]/20"
            />
            <p className="text-xs text-[#1E1E1E]/40">
              System notifications will be sent to this address
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Send className="h-5 w-5 text-[#1E4D3A]" />
            Test Email
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Send a test email to verify your configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Input
              type="email"
              placeholder="Enter email to send test"
              className="flex-1 border-[#E8EBE7] focus:border-[#1E4D3A] focus:ring-[#1E4D3A]/20"
            />
            <Button
              onClick={handleTestEmail}
              disabled={testingSend}
              className={testSent 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-[#0F2A1D] hover:bg-[#1E4D3A]"
              }
            >
              {testSent ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Sent!
                </>
              ) : testingSend ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-[#1E1E1E]/40 mt-3">
            A test email will be sent to the specified address
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailSettings;
