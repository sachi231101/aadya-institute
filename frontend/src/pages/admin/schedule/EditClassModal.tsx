import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCourseStore } from "../../../store/course.store";
import { useFacultyList } from "../../../hooks/useFaculty";
import { useScheduleStore } from "../../../store/schedule.store";
import type { ClassSession, ClassMode, ClassStatus } from "../../../types/schedule.types";

interface EditClassModalProps {
  session: ClassSession | null;
  onClose: () => void;
}

export const EditClassModal: React.FC<EditClassModalProps> = ({ session, onClose }) => {
  const { batches } = useCourseStore();
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const facultyList = facultyResponse?.data ?? [];
  const { updateClassSession } = useScheduleStore();

  const [title, setTitle] = useState("");
  const [batchId, setBatchId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [mode, setMode] = useState<ClassMode>("OFFLINE");
  const [status, setStatus] = useState<ClassStatus>("UPCOMING");

  useEffect(() => {
    if (session) {
      setTitle(session.title);
      setBatchId(session.batchId);
      setFacultyId(session.facultyId);
      setDate(session.date);
      setStartTime(session.startTime);
      setEndTime(session.endTime);
      setRoomNo(session.roomNo || "");
      setMode(session.mode);
      setStatus(session.status);
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    
    await updateClassSession(session.id, {
      title,
      batchId,
      facultyId,
      scheduledDate: date,
      startTime,
      endTime,
      roomNo,
      mode,
      status,
    });
    
    onClose();
  };

  if (!session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#1769AA]" />
          Edit Class Session
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Class Topic / Lecture Title *</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-white border-slate-300 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Batch *</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Faculty *</label>
            <select
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="bg-white border-slate-300 text-slate-900 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
              <Input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="10:00 AM"
                className="bg-white border-slate-300 text-slate-900 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
              <Input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="12:00 PM"
                className="bg-white border-slate-300 text-slate-900 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Class Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ClassMode)}
                className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="OFFLINE">Campus Offline</option>
                <option value="ONLINE">Online Virtual</option>
                <option value="HYBRID">Hybrid Mode</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ClassStatus)}
                className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Lab Allocation</label>
            <Input
              type="text"
              value={roomNo}
              onChange={(e) => setRoomNo(e.target.value)}
              placeholder="Lab 201"
              className="bg-white border-slate-300 text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
