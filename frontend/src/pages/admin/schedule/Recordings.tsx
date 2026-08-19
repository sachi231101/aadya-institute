import React, { useState } from "react";
import { Video, Play, Clock, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRecordings } from "@/hooks/useRecordings";

export const Recordings: React.FC = () => {
  const [search, setSearch] = useState("");

  const { data: recordingsResponse, isLoading } = useRecordings({
    page: 1,
    limit: 50,
    batchId: undefined,
  });

  const recordings = recordingsResponse?.data || [];

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Video className="h-6 w-6 text-[#1769AA]" />
            Class Recordings
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage class session recordings — 30 day retention policy
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Video className="h-6 w-6 text-[#1769AA]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{recordings.length}</p>
              <p className="text-xs text-text-secondary font-medium">Total Recordings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Play className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {recordings.filter((r: any) => r.status === "ACTIVE").length}
              </p>
              <p className="text-xs text-text-secondary font-medium">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {recordings.filter((r: any) => getDaysRemaining(r.expiresAt) <= 7).length}
              </p>
              <p className="text-xs text-text-secondary font-medium">Expiring Soon (≤7 days)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              placeholder="Search by session title or batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recordings Table */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Session</TableHead>
                <TableHead className="font-semibold">Batch</TableHead>
                <TableHead className="font-semibold">Faculty</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Duration</TableHead>
                <TableHead className="font-semibold">Expires In</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-text-secondary">
                    Loading recordings...
                  </TableCell>
                </TableRow>
              ) : recordings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Video className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-text-secondary font-medium">No recordings found</p>
                    <p className="text-xs text-text-secondary mt-1">Recordings will appear here after class sessions are recorded</p>
                  </TableCell>
                </TableRow>
              ) : (
                recordings.map((rec: any) => {
                  const daysRemaining = getDaysRemaining(rec.expiresAt);
                  return (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium text-sm">
                        {rec.classSession?.title || "Class Session"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {rec.classSession?.batch?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {rec.classSession?.faculty?.user?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {rec.classSession?.scheduledDate
                          ? new Date(rec.classSession.scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {rec.duration ? `${Math.floor(rec.duration / 60)}m` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${
                          daysRemaining <= 3 ? "bg-red-50 text-red-700 border-red-200" :
                          daysRemaining <= 7 ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-green-50 text-green-700 border-green-200"
                        }`}>
                          {daysRemaining > 0 ? `${daysRemaining} days` : "Expired"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${
                          rec.status === "ACTIVE"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}>
                          {rec.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#1769AA]">
                            <Play size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
