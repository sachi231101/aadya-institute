import React, { useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  FileText,
  FileCode,
  Presentation,
  ExternalLink,
  Loader2,
  AlertCircle,
  Trash2,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PageContainer,
  PageHeader,
  MetricGrid,
  FilterToolbar,
  PageSection,
} from "@/components/layout";
import {
  useStudyMaterials,
  useDeleteStudyMaterial,
  useCreateStudyMaterial,
} from "@/hooks/useStudyMaterials";
import { useBatches } from "@/hooks/useBatches";
import { useAuthStore } from "@/store/auth.store";
import { useFacultyDashboard } from "@/hooks/useFaculty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const formatBytes = (bytes?: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FacultyStudyMaterials: React.FC = () => {
  const { user } = useAuthStore();
  const { data: dashboardRes } = useFacultyDashboard();
  const facultyId = user?.facultyId || dashboardRes?.data?.profile?.id;
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"pdf" | "slides" | "code" | "doc" | "notes">("pdf");
  const [description, setDescription] = useState("");
  const [batchId, setBatchId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { batches } = useBatches(facultyId ? { facultyId } : undefined);
  const { data, isLoading, isError, refetch } = useStudyMaterials({
    limit: 50,
    search: search.trim() || undefined,
    batchId: batchFilter !== "ALL" ? batchFilter : undefined,
  });
  const createMutation = useCreateStudyMaterial();
  const deleteMutation = useDeleteStudyMaterial();

  const materials = data?.data ?? [];

  const filtered = useMemo(() => materials, [materials]);

  const metrics = useMemo(
    () => [
      { label: "Total Materials", value: filtered.length },
      {
        label: "PDFs",
        value: filtered.filter((m) => m.fileType === "pdf").length,
      },
      {
        label: "Linked to Sessions",
        value: filtered.filter((m) => m.classSessionId).length,
      },
      {
        label: "Batches Covered",
        value: new Set(filtered.map((m) => m.batchId).filter(Boolean)).size,
      },
    ],
    [filtered]
  );

  const typeIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-4 h-4 text-rose-500" />;
      case "slides":
        return <Presentation className="w-4 h-4 text-amber-500" />;
      case "code":
        return <FileCode className="w-4 h-4 text-indigo-500" />;
      default:
        return <BookOpen className="w-4 h-4 text-blue-500" />;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim() || !fileUrl.trim() || !batchId) {
      setFormError("Title, file URL, and batch are required.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        fileType,
        fileName: fileName.trim() || `${title.trim()}.${fileType === "slides" ? "pptx" : fileType}`,
        fileUrl: fileUrl.trim(),
        batchId,
      });
      setIsCreateOpen(false);
      setTitle("");
      setFileUrl("");
      setFileName("");
      setDescription("");
      setBatchId("");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create study material");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Study Materials"
        description="Materials you uploaded for your batches and class sessions"
        actions={
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Upload Material
          </Button>
        }
      />

      <MetricGrid density="compact">
        {metrics.map((m) => (
          <Card key={m.label} className="border border-border/80 shadow-2xs bg-card rounded-xl">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {m.label}
              </p>
              <h3 className="text-xl font-bold text-foreground mt-0.5">{m.value}</h3>
            </CardContent>
          </Card>
        ))}
      </MetricGrid>

      <FilterToolbar>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
        >
          <option value="ALL">All batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.name}
            </option>
          ))}
        </select>
      </FilterToolbar>

      <PageSection>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading study materials...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-600">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <p>Failed to load study materials.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
            <BookOpen className="w-10 h-10 opacity-40" />
            <p>No study materials yet. Upload notes for your batches.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((m) => (
              <Card key={m.id} className="border-slate-200">
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex gap-3 min-w-0">
                    <div className="mt-1">{typeIcon(m.fileType)}</div>
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium text-slate-900 truncate">{m.title}</div>
                      {m.description ? (
                        <p className="text-sm text-slate-500 line-clamp-2">{m.description}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <Badge variant="secondary">{m.fileType.toUpperCase()}</Badge>
                        <span>{m.batch?.code || m.classSession?.batch?.code || "—"}</span>
                        <span>{formatBytes(m.fileSize)}</span>
                        <span>{new Date(m.createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <a href={m.fileUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm("Delete this study material?")) {
                          void deleteMutation.mutateAsync(m.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageSection>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Study Material</DialogTitle>
            <DialogDescription>
              Attach a resource for one of your teaching-desk batches.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Batch</Label>
              <select
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                required
              >
                <option value="">Select batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>File type</Label>
              <select
                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm"
                value={fileType}
                onChange={(e) => setFileType(e.target.value as typeof fileType)}
              >
                <option value="pdf">PDF</option>
                <option value="slides">Slides</option>
                <option value="code">Code</option>
                <option value="doc">Document</option>
                <option value="notes">Notes</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>File name</Label>
              <Input value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>File URL</Label>
              <Input
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
