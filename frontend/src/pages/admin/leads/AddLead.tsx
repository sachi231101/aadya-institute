import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { PageContainer, PageHeader } from "@/components/layout";
import { LeadCreateForm } from "./components/LeadCreateForm";

export const AddLead: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canEditItem, isAdmin, roleScope } = usePermissions();

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
      ? "/center"
      : "/admin";
  const leadsListPath = `${basePath}/leads`;
  const aiCallingPath = `${basePath}/leads/ai-calling`;
  const fromAiCalling = Boolean(
    (location.state as { fromAiCalling?: boolean } | null)?.fromAiCalling
  );
  const leadWriteKey = "leads.all";
  const canWrite = isAdmin || !roleScope || canEditItem(leadWriteKey);

  useEffect(() => {
    if (!canWrite) {
      navigate(leadsListPath, { replace: true, state: { accessDenied: true, readOnly: true } });
    }
  }, [canWrite, navigate, leadsListPath]);

  if (!canWrite) {
    return null;
  }

  return (
    <PageContainer maxWidth="narrow">
      <Button
        variant="ghost"
        onClick={() => navigate(fromAiCalling ? aiCallingPath : leadsListPath)}
        className="gap-2 -ml-2"
      >
        <ArrowLeft size={16} /> {fromAiCalling ? "Back to AI Calling" : "Back to Leads"}
      </Button>

      <PageHeader
        title="Add New Lead"
        description="Capture a new lead for AI voice qualification"
      />

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <LeadCreateForm
            onCancel={() => navigate(fromAiCalling ? aiCallingPath : leadsListPath)}
            footerHint="Creating a lead queues an AI qualification call automatically when AI calling is enabled."
            onSuccess={({ leadId }) => {
              if (fromAiCalling) {
                navigate(aiCallingPath);
                return;
              }
              if (leadId) {
                navigate(`${basePath}/leads/${leadId}`);
              } else {
                navigate(leadsListPath);
              }
            }}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
};
