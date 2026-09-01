import React from "react";
import { Target, Loader2, AlertCircle } from "lucide-react";
import { useCounsellorPerformance } from "@/hooks/useLeads";
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

export const CounsellorPerformance: React.FC = () => {
  const { data, isLoading, isError, refetch } = useCounsellorPerformance();
  const counsellors = data?.data?.counsellors || data?.data || [];

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#1769AA]" /></div>;
  if (isError) return <div className="text-center py-20 text-red-600"><AlertCircle className="w-8 h-8 mx-auto mb-2" />Failed to load.<Button variant="link" onClick={() => refetch()}>Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Counsellor Performance</h2>
        <p className="text-sm text-text-secondary">Lead conversion and follow-up metrics by counsellor.</p>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-4">
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
              {!Array.isArray(counsellors) || counsellors.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-text-secondary"><Target className="w-8 h-8 mx-auto mb-2 opacity-40" />No performance data.</TableCell></TableRow>
              ) : (
                counsellors.map((c: { id: string; name: string; totalLeads?: number; converted?: number; pendingFollowUps?: number; conversionRate?: number }) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.totalLeads ?? 0}</TableCell>
                    <TableCell>{c.converted ?? 0}</TableCell>
                    <TableCell>{c.pendingFollowUps ?? 0}</TableCell>
                    <TableCell>{c.conversionRate ?? 0}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
