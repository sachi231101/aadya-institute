import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Target, Loader2, AlertCircle } from "lucide-react";
import { useCounsellorPerformance } from "@/hooks/useLeads";
import { PageContainer, PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPortalBasePath } from "@/utils/portal-path";

type CounsellorPerfRow = {
  counsellorId?: string;
  id?: string;
  name: string;
  totalLeads?: number;
  converted?: number;
  followUps?: number;
  pendingFollowUps?: number;
  conversionRate?: string | number;
};

export const CounsellorPerformance: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const { data, isLoading, isError, refetch } = useCounsellorPerformance();
  const counsellors: CounsellorPerfRow[] = Array.isArray(data?.data?.counsellors)
    ? data.data.counsellors
    : Array.isArray(data?.data)
      ? data.data
      : [];

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (isError) return <div className="text-center py-20 text-red-600"><AlertCircle className="w-8 h-8 mx-auto mb-2" />Failed to load.<Button variant="link" onClick={() => refetch()}>Retry</Button></div>;

  const openCounsellorProfile = (counsellorId?: string) => {
    if (!counsellorId) return;
    if (basePath === "/admin") {
      navigate(`/admin/counsellors/${counsellorId}`);
      return;
    }
    navigate(`${basePath}/counselor/${counsellorId}`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Counsellor Performance"
        description="Lead conversion and follow-up metrics by counsellor."
      />
      <Card className="border border-border shadow-xs rounded-xl overflow-hidden bg-card">
        <CardContent className="p-0">
          <div
            className={
              "min-w-0 " +
              "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
              "[&_thead]:bg-muted/50 " +
              "[&_th]:h-9 [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:font-semibold " +
              "[&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground " +
              "[&_th]:border [&_th]:border-border [&_th]:whitespace-nowrap " +
              "[&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_td]:border [&_td]:border-border " +
              "[&_tbody_tr]:hover:bg-muted/30 [&_tbody_tr]:transition-colors"
            }
          >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Counsellor</TableHead>
                <TableHead>Total Leads</TableHead>
                <TableHead>Converted</TableHead>
                <TableHead>Pending Follow-ups</TableHead>
                <TableHead>Conversion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counsellors.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-text-secondary"><Target className="w-8 h-8 mx-auto mb-2 opacity-40" />No performance data.</TableCell></TableRow>
              ) : (
                counsellors.map((c) => {
                  const counsellorId = c.counsellorId || c.id;
                  const rowId = counsellorId || c.name;
                  const rate =
                    typeof c.conversionRate === "string"
                      ? c.conversionRate
                      : `${c.conversionRate ?? 0}%`;
                  return (
                    <TableRow
                      key={rowId}
                      className={counsellorId ? "cursor-pointer" : undefined}
                      onClick={() => openCounsellorProfile(counsellorId)}
                      title={counsellorId ? "View counsellor profile" : undefined}
                    >
                      <TableCell className="font-medium text-primary">{c.name}</TableCell>
                      <TableCell>{c.totalLeads ?? 0}</TableCell>
                      <TableCell>{c.converted ?? 0}</TableCell>
                      <TableCell>{c.followUps ?? c.pendingFollowUps ?? 0}</TableCell>
                      <TableCell>{rate}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};
