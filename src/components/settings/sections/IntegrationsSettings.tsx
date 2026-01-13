import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plug, Webhook, Key, ExternalLink, Check, X, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const IntegrationsSettings = () => {
  const navigate = useNavigate();
  const [showApiKey, setShowApiKey] = useState(false);

  const connectedServices = [
    { name: "Google Analytics", status: "connected", icon: "📊" },
    { name: "Stripe", status: "not_connected", icon: "💳" },
    { name: "SendGrid", status: "not_connected", icon: "📧" },
    { name: "Cloudflare", status: "connected", icon: "☁️" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F2A1D]">Integrations</h2>
        <p className="text-sm text-[#1E1E1E]/60 mt-1">
          Connect external services and manage API access
        </p>
      </div>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Plug className="h-5 w-5 text-[#1E4D3A]" />
            Connected Services
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Third-party services connected to your platform
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-[#E8EBE7]">
          {connectedServices.map((service) => (
            <div key={service.name} className="flex items-center justify-between p-4 hover:bg-[#FAFBF9] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FAFBF9] border border-[#E8EBE7] flex items-center justify-center text-xl">
                  {service.icon}
                </div>
                <div>
                  <span className="font-medium text-[#1E1E1E]">{service.name}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {service.status === "connected" ? (
                      <>
                        <Check className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600">Connected</span>
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3 text-[#1E1E1E]/40" />
                        <span className="text-xs text-[#1E1E1E]/40">Not connected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant={service.status === "connected" ? "outline" : "default"}
                size="sm"
                className={service.status === "connected" 
                  ? "border-[#E8EBE7] text-[#1E1E1E]" 
                  : "bg-[#0F2A1D] hover:bg-[#1E4D3A] text-white"
                }
              >
                {service.status === "connected" ? "Configure" : "Connect"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Webhook className="h-5 w-5 text-[#1E4D3A]" />
            Webhooks
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Send real-time notifications to external services
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8 border border-dashed border-[#E8EBE7] rounded-xl bg-[#FAFBF9]">
            <Webhook className="h-10 w-10 mx-auto text-[#1E1E1E]/20 mb-3" />
            <p className="text-sm text-[#1E1E1E]/60 mb-4">No webhooks configured</p>
            <Button
              variant="outline"
              className="border-[#E8EBE7] text-[#0F2A1D]"
            >
              Add Webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Key className="h-5 w-5 text-[#1E4D3A]" />
            API Keys
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Manage API access for external applications
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Public API Key</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={showApiKey ? "pk_live_a1b2c3d4e5f6g7h8i9j0" : "pk_live_••••••••••••••••••••"}
                  readOnly
                  className="font-mono text-sm bg-[#FAFBF9] border-[#E8EBE7] pr-10"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1E1E1E]/40 hover:text-[#1E1E1E]/60"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button variant="outline" size="sm" className="border-[#E8EBE7]">
                Copy
              </Button>
            </div>
            <p className="text-xs text-[#1E1E1E]/40">Use this key for client-side API calls</p>
          </div>

          <div className="space-y-2">
            <Label className="text-[#1E1E1E]">Secret API Key</Label>
            <div className="flex gap-2">
              <Input
                value="sk_live_••••••••••••••••••••"
                readOnly
                className="font-mono text-sm bg-[#FAFBF9] border-[#E8EBE7]"
              />
              <Button variant="outline" size="sm" className="border-[#E8EBE7]">
                Reveal
              </Button>
            </div>
            <p className="text-xs text-[#C9A24D]">
              ⚠️ Never expose this key in client-side code
            </p>
          </div>

          <div className="pt-4">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/api")}
              className="border-[#E8EBE7] text-[#0F2A1D]"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage All API Keys
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsSettings;
