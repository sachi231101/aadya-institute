import React, { useState } from "react";
import {
  FileText,
  Search,
  Loader2,
  AlertCircle,
  Plus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  useDocuments,
  useCreateDocument,
  useVerifyDocument,
  useRejectDocument,
} from "@/hooks/useDocuments";
import type { DocumentEntityType } from "@/services/documents.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DocumentManagementProps {
  entityType: DocumentEntityType;
  title: string;
  description: string;
  entityIdLabel: string;
}

export const DocumentManagement: React.FC<DocumentManagementProps> = ({
  entityType,
  title,
  description,
  entityIdLabel,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [rejectDocId, setRejectDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [formError, setFormError] = useState("");
  const [uploadForm, setUploadForm] = useState({
    entityId: "",
    name: "",
    fileName: "",
    fileUrl: "",
  });

  const { data, isLoading, isError, refetch } = useDocuments({
    entityType,
    search: searchTerm || undefined,
    limit: 50,
  });
  const createMutation = useCreateDocument();
  const verifyMutation = useVerifyDocument();
  const rejectMutation = useRejectDocument();

  const documents = data?.data?.data || data?.data || [];

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await createMutation.mutateAsync({
        entityType,
        entityId: uploadForm.entityId,
        name: uploadForm.name,
        fileName: uploadForm.fileName,
        fileUrl: uploadForm.fileUrl || undefined,
      });
      setShowUpload(false);
      setUploadForm({ entityId: "", name: "", fileName: "", fileUrl: "" });
      refetch();
    } catch {
      setFormError("Failed to upload document.");
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await verifyMutation.mutateAsync({ id });
      refetch();
    } catch {
      alert("Failed to verify document.");
    }
  };

  const handleReject = async () => {
    if (!rejectDocId || !rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ id: rejectDocId, rejectedReason: rejectReason });
      setRejectDocId(null);
      setRejectReason("");
      refetch();
    } catch {
      alert("Failed to reject document.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
        <Button className="bg-[#1769AA] text-white" onClick={() => setShowUpload(true)}>
          <Plus className="mr-2 h-4 w-4" /> Upload Document
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>{entityIdLabel}</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-red-600">
                    <AlertCircle className="w-5 h-5 inline mr-2" />
                    Failed to load.
                    <Button variant="link" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : !Array.isArray(documents) || documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-text-secondary">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No documents found.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map(
                  (d: {
                    id: string;
                    name: string;
                    entityId: string;
                    fileName: string;
                    fileUrl?: string;
                    status: string;
                    createdAt: string;
                  }) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="font-mono text-sm">{d.entityId}</TableCell>
                      <TableCell>
                        {d.fileUrl ? (
                          <a
                            href={d.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1769AA] hover:underline text-sm"
                          >
                            {d.fileName}
                          </a>
                        ) : (
                          d.fileName
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(d.createdAt).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="text-right">
                        {d.status !== "VERIFIED" && d.status !== "REJECTED" && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600"
                              onClick={() => handleVerify(d.id)}
                              disabled={verifyMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => setRejectDocId(d.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label>{entityIdLabel} *</Label>
              <Input
                required
                placeholder="Entity UUID"
                value={uploadForm.entityId}
                onChange={(e) => setUploadForm((f) => ({ ...f, entityId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Document Name *</Label>
              <Input
                required
                placeholder="e.g. Aadhar Card"
                value={uploadForm.name}
                onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>File Name *</Label>
              <Input
                required
                placeholder="aadhar.pdf"
                value={uploadForm.fileName}
                onChange={(e) => setUploadForm((f) => ({ ...f, fileName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>File URL</Label>
              <Input
                placeholder="https://storage.example.com/file.pdf"
                value={uploadForm.fileUrl}
                onChange={(e) => setUploadForm((f) => ({ ...f, fileUrl: e.target.value }))}
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#1769AA] text-white"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDocId} onOpenChange={() => setRejectDocId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Input
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectDocId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
              >
                Reject Document
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const StudentDocuments: React.FC = () => (
  <DocumentManagement
    entityType="STUDENT"
    title="Student Documents"
    description="Uploaded student documents and verification status."
    entityIdLabel="Student ID"
  />
);
