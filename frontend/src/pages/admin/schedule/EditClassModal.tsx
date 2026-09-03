import React, { useState, useEffect } from "react";
import { Calendar, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBatches } from "../../../hooks/useBatches";
import { useFacultyList } from "../../../hooks/useFaculty";
import { useUpdateClassSession } from "../../../hooks/useClassSessions";
import { ClassroomDropdown } from "@/components/common/ClassroomDropdown";
import type { ClassSession, ClassMode, ClassStatus } from "../../../types/schedule.types";

interface EditClassModalProps {
  session: ClassSession | null;
  onClose: () => void;
  onSave?: (updated: ClassSession) => void;
}

export const EditClassModal: React.FC<EditClassModalProps> = ({ session, onClose, onSave }) => {
  const { batches } = useBatches();
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const facultyList = facultyResponse?.data ?? [];
  const updateSessionMutation = useUpdateClassSession();

  const [title, setTitle] = useState("");
  const [batchId, setBatchId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [classroomMasterId, setClassroomMasterId] = useState("");
  const [mode, setMode] = useState<ClassMode>("OFFLINE");
  const [status, setStatus] = useState<ClassStatus>("UPCOMING");

  useEffect(() => {
    if (session) {
      setTitle(session.title || "Class Session");
      setBatchId(session.batchId || "");
      setFacultyId(session.facultyId || "");
      setDate(session.date || "");
      setStartTime(session.startTime || "09:00");
      setEndTime(session.endTime || "17:00");
      setClassroomMasterId(session.classroomMasterId || "");
      setMode(session.mode || "OFFLINE");
      setStatus(session.status || "UPCOMING");
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    
    const selectedBatch = batches.find((b) => b.id === batchId);
    const selectedFaculty = facultyList.find((f) => f.id === facultyId);

    const updatedSession: ClassSession = {
      ...session,
      title,
      batchId,
      batchCode: selectedBatch?.code || session.batchCode,
      facultyId,
      facultyName: selectedFaculty?.user?.name || (selectedFaculty as any)?.name || session.facultyName,
      date,
      startTime,
      endTime,
      roomNo: session.roomNo,
      mode,
      status,
    };

    await updateSessionMutation.mutateAsync({
      id: session.id,
      payload: {
        title,
        batchId,
        facultyId,
        scheduledDate: date,
        startTime,
        endTime,
        classroomMasterId: classroomMasterId || undefined,
        mode,
        status,
      },
    });

    if (onSave) {
      onSave(updatedSession);
    }
    
    onClose();
  };

  if (!session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 text-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#1769AA]" />
            Edit Class Timetable Entry
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Topic / Title *
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-xl border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Batch *
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
                required
              >
                <option value="">Select Batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Faculty *
              </label>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
                required
              >
                <option value="">Select Faculty</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.user?.name || (f as any).name} ({f.employeeCode || (f as any).facultyCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date *
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="rounded-xl border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time
              </label>
              <Input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="09:00"
                className="rounded-xl border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Time
              </label>
                <Input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="17:00"
                  className="rounded-xl border-slate-200 text-xs"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Classroom / Lab
              </label>
              <ClassroomDropdown
                value={classroomMasterId}
                onChange={setClassroomMasterId}
                className="mt-0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ClassMode)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
              >
                <option value="OFFLINE">Campus (OFFLINE)</option>
                <option value="ONLINE">Online (ONLINE)</option>
                <option value="HYBRID">Hybrid (HYBRID)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Session Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ClassStatus)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
            >
              <option value="UPCOMING">Upcoming</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#1769AA] hover:bg-[#145a92] text-white rounded-xl text-xs font-semibold px-4"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
