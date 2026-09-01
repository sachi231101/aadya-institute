import React, { useState } from "react";
import { Building2, Search, Loader2, AlertCircle, Plus } from "lucide-react";
import { usePlacementCompanies, useCreatePlacementCompany } from "@/hooks/usePlacement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Companies: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const { data, isLoading, isError, refetch } = usePlacementCompanies({ search: searchTerm || undefined });
  const createMutation = useCreatePlacementCompany();
  const companies = data?.data?.data || data?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ name });
      setShowModal(false);
      setName("");
      refetch();
    } catch {
      alert("Failed to create company");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Companies</h2>
          <p className="text-sm text-text-secondary">Partner companies for placement drives.</p>
        </div>
        <Button className="bg-[#1769AA] text-white" onClick={() => setShowModal(true)}><Plus className="mr-2 h-4 w-4" /> Add Company</Button>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input placeholder="Search companies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load.</TableCell></TableRow>
              ) : !Array.isArray(companies) || companies.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-text-secondary"><Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />No companies.</TableCell></TableRow>
              ) : (
                companies.map((c: { id: string; name: string; industry?: string; contactEmail?: string; status?: string }) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.industry || "—"}</TableCell>
                    <TableCell>{c.contactEmail || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{c.status || "ACTIVE"}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Add Company</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Name *</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1769AA] text-white">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
