import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Presentation,
  FolderArchive,
  BookOpen,
  Loader2,
  ExternalLink,
} from "lucide-react";

export interface StudyMaterialEntry {
  id: string;
  title: string;
  fileType: "pdf" | "slides" | "code" | "doc" | "notes";
  fileSize: string;
  fileUrl: string;
  description?: string;
  uploadedAt: string;
}

export interface UploadStudyMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: {
    id: string;
    courseName: string;
    subjectName?: string;
    batchCode?: string;
    batchName?: string;
    facultyName?: string;
  };
  onSuccess?: () => void;
}

export const UploadStudyMaterialsModal: React.FC<UploadStudyMaterialsModalProps> = ({
  isOpen,
  onClose,
  sessionData,
  onSuccess,
}) => {
  const [materials, setMaterials] = useState<StudyMaterialEntry[]>([]);
  const [title, setTitle] = useState("");
  const [fileType, setFileType] = useState<StudyMaterialEntry["fileType"]>("pdf");
  const [fileUrl, setFileUrl] = useState("");
  const [description, setDescription] = useState("");
  const [fileSize, setFileSize] = useState("2.4 MB");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Please enter a title for the material.");
      return;
    }

    const newEntry: StudyMaterialEntry = {
      id: `mat-${Date.now()}`,
      title: title.trim(),
      fileType,
      fileSize: fileSize || "1.5 MB",
      fileUrl: fileUrl.trim() || "https://example.com/materials/handout.pdf",
      description: description.trim() || undefined,
      uploadedAt: new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };

    setMaterials((prev) => [newEntry, ...prev]);
    setTitle("");
    setFileUrl("");
    setDescription("");
    setErrorMessage(null);
    setSuccessMessage("Material added to session list!");
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSaveAndClose = async () => {
    setIsSubmitting(true);
    // Simulate brief save
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess?.();
      onClose();
    }, 500);
  };

  const renderTypeIcon = (type: StudyMaterialEntry["fileType"]) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1">
            <BookOpen className="w-6 h-6 stroke-[2.2]" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Upload Study Materials
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Attach notes, slide decks, PDFs, code files, or workbooks for {sessionData.courseName} ({sessionData.batchCode || "Batch"}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddMaterial} className="space-y-3.5 my-2 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Add New Material
          </p>

          {errorMessage && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Title / Name
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 4 Slides PDF"
                required
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Type
              </Label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as any)}
                className="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="pdf">PDF Document</option>
                <option value="slides">Presentation (PPT / Slides)</option>
                <option value="code">Source Code / Archive</option>
                <option value="doc">Notes / Word Document</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Download / Resource Link
            </Label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/... or https://github.com/..."
              className="rounded-xl h-9 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes / Description (Optional)
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Key concepts and exercise solution walkthrough"
              className="rounded-xl h-9 text-xs"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Material to Class
          </Button>
        </form>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Attached Materials ({materials.length})</span>
            {materials.length === 0 && (
              <span className="text-slate-400 font-normal text-[11px]">No materials added yet</span>
            )}
          </div>

          {materials.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {materials.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      {renderTypeIcon(m.fileType)}
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {m.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {m.fileType.toUpperCase()} • {m.fileSize}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {m.fileUrl && (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Open link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(m.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-600 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-400">
              No study materials uploaded for this class.
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleSaveAndClose}
            disabled={isSubmitting}
            className="rounded-xl bg-[#1769AA] hover:bg-[#125890] text-white font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              "Done"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
