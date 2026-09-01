import React, { useMemo, useState } from "react";
import { Video, Search, Loader2, AlertCircle } from "lucide-react";
import { useClassSessions } from "@/hooks/useClassSessions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const LiveClasses: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading, isError, refetch } = useClassSessions({ sessionStatus: "LIVE", limit: 50 });

  const sessions = useMemo(() => {
    const list = data?.data || [];
    if (!Array.isArray(list)) return [];
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter((s: { title?: string; batch?: { name?: string }; faculty?: { user?: { name?: string } } }) =>
      (s.title || "").toLowerCase().includes(q) ||
      (s.batch?.name || "").toLowerCase().includes(q) ||
      (s.faculty?.user?.name || "").toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Live Classes</h2>
        <p className="text-sm text-text-secondary">Currently active class sessions across batches.</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input placeholder="Search live sessions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading live sessions...</TableCell></TableRow>
                ) : isError ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load.<Button variant="link" onClick={() => refetch()}>Retry</Button></TableCell></TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-text-secondary"><Video className="w-8 h-8 mx-auto mb-2 opacity-40" />No live classes right now.</TableCell></TableRow>
                ) : (
                  sessions.map((s: { id: string; title?: string; startTime: string; endTime: string; sessionStatus?: string; batch?: { name?: string }; faculty?: { user?: { name?: string } } }) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title || "Class Session"}</TableCell>
                      <TableCell>{s.batch?.name || "—"}</TableCell>
                      <TableCell>{s.faculty?.user?.name || "—"}</TableCell>
                      <TableCell>{s.startTime} – {s.endTime}</TableCell>
                      <TableCell><Badge className="bg-red-500 text-white">{s.sessionStatus || "LIVE"}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
