import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Users, BookOpen, AlertCircle, Loader2 } from "lucide-react";

export interface CompleteClassDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isSubmitting?: boolean;
  classDetails: {
    title: string;
    courseName: string;
    subjectName?: string;
    batchName?: string;
    batchCode?: string;
    startTime: string;
    endTime: string;
    roomNo?: string;
    totalStudents: number;
    presentStudents: number;
    absentStudents: number;
    attendanceRate: number;
  };
}

export const CompleteClassDialog: React.FC<CompleteClassDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  classDetails,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
            <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Complete this class?
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Review the final class summary below. Once completed, attendance will be locked and this session will no longer appear as Live.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-base">
                {classDetails.courseName}
              </p>
              {classDetails.subjectName && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Module: <span className="font-medium text-slate-700 dark:text-slate-300">{classDetails.subjectName}</span>
                </p>
              )}
            </div>
            {classDetails.batchCode && (
              <Badge variant="outline" className="font-mono text-xs bg-white dark:bg-slate-900">
                {classDetails.batchCode}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{classDetails.startTime} – {classDetails.endTime}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>{classDetails.roomNo || "Room 101"}</span>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Attendance Summary
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {classDetails.attendanceRate.toFixed(1)}% Present
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Total Enrolled: <strong className="text-slate-800 dark:text-slate-200">{classDetails.totalStudents}</strong></span>
              <span>Present: <strong className="text-emerald-600 dark:text-emerald-400">{classDetails.presentStudents}</strong></span>
              <span>Absent: <strong className="text-rose-600 dark:text-rose-400">{classDetails.absentStudents}</strong></span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Completing...
              </>
            ) : (
              "Complete Class"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
