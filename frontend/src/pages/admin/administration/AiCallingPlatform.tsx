import React from "react";
import { Link } from "react-router-dom";
import { Bot, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

/**
 * Dial-only mode: Sarvam Voice Agents are created/committed/deployed in the Sarvam dashboard.
 * Aadya ERP only triggers outbound calls using backend .env credentials.
 * Full platform agent-authoring UI is intentionally disabled for now.
 */
export const AiCallingPlatform: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;

  if (!isSuperAdmin) {
    return (
      <PageContainer>
        <PageHeader title="AI Calling Platform" description="Restricted to Super Admin." />
        <Card className="border-border/50">
          <CardContent className="p-6 text-sm text-text-secondary">
            You do not have permission to view this page.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="AI Calling Platform"
        description="Dial-only mode — agent authoring is managed outside Aadya."
        actions={<Badge variant="secondary">Dial-only</Badge>}
      />

      <Card className="border-border/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">
                Voice Agents are managed in the Sarvam dashboard
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">
                Create, configure (script, greeting, voice, variables), commit, and deploy the agent
                in Sarvam. Aadya ERP does not create or deploy Sarvam agents. Put API keys in backend{" "}
                <code className="text-xs">.env</code> (
                <code className="text-xs">TELEPHONY_BASE_URL</code>,{" "}
                <code className="text-xs">TELEPHONY_API_KEY</code> or{" "}
                <code className="text-xs">SARVAM_API_KEY</code>,{" "}
                <code className="text-xs">TELEPHONY_FROM_NUMBER</code>), then enable dialing under
                Integrations → AI Calling.
              </p>
              <ul className="text-sm text-text-secondary list-disc pl-5 space-y-1">
                <li>Sarvam dashboard: agent + commit + deploy</li>
                <li>Backend .env: telephony / Sarvam credentials</li>
                <li>Integrations → AI Calling: enable dialer + from number + hours/limits</li>
                <li>Lead Management → AI Calling: import leads and trigger calls</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild className="bg-primary text-white">
              <Link to={ROUTES.ADMIN.ADMINISTRATION.INTEGRATIONS + "/ai_calling"}>
                Open AI Calling dialer settings
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a
                href="https://docs.sarvam.ai/conversations/build/concepts/introduction"
                target="_blank"
                rel="noreferrer"
              >
                Sarvam Voice Agents docs
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};
