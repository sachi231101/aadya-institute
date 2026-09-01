import React, { useState } from "react";
import { Receipt, Search, Loader2, AlertCircle } from "lucide-react";
import { useFeeReceipts } from "@/hooks/useFees";
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

export const Receipts: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useFeeReceipts({ search: searchTerm || undefined, page, limit: 20 });
  const receipts = data?.data?.data || data?.data || [];
  const meta = data?.data || { totalPages: 1, page: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Fee Receipts</h2>
        <p className="text-sm text-text-secondary">Browse issued fee receipts and payment records.</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input placeholder="Search receipts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load.<Button variant="link" onClick={() => refetch()}>Retry</Button></TableCell></TableRow>
              ) : !Array.isArray(receipts) || receipts.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-text-secondary"><Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />No receipts found.</TableCell></TableRow>
              ) : (
                receipts.map((r: { id: string; receiptNo: string; studentName: string; amount: number; method: string; date: string; status: string }) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-medium">{r.receiptNo}</TableCell>
                    <TableCell>{r.studentName}</TableCell>
                    <TableCell className="font-bold">₹{r.amount?.toLocaleString("en-IN")}</TableCell>
                    <TableCell>{r.method}</TableCell>
                    <TableCell>{new Date(r.date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {meta.totalPages > 1 && (
            <div className="flex justify-between text-sm">
              <span>Page {meta.page} of {meta.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
