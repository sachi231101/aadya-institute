import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, AlertCircle } from "lucide-react";
import { useBatches } from "@/hooks/useBatches";
import { useCourses } from "@/hooks/useCourses";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MasterSelect } from "@/components/common/MasterSelect";

export const CreateBatch: React.FC = () => {
  const navigate = useNavigate();
  const { courses } = useCourses();
  const { createBatch, loading } = useBatches();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [courseId, setCourseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [schedulePattern, setSchedulePattern] = useState("MWF");
  const [timeSlot, setTimeSlot] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const batch = await createBatch({
        name,
        code,
        courseId,
        startDate,
        capacity,
        schedulePattern: schedulePattern as "MWF" | "TTS" | "WEEKEND" | "CUSTOM",
        timeSlot: timeSlot || undefined,
      });
      if (batch?.id) {
        navigate(ROUTES.ADMIN.BATCHES.DETAIL(batch.id));
      } else {
        navigate(ROUTES.ADMIN.BATCHES.ALL);
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Failed to create batch");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">Create Batch</h2>
        <p className="text-sm text-text-secondary">Set up a new training batch for a course.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <div>
              <Label>Batch Name *</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. MERN Batch A - Morning" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Batch Code *</Label>
                <Input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="BATCH-2026-A" />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
              </div>
            </div>

            <div>
              <Label>Course *</Label>
              <select
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full h-10 px-3 border rounded-md text-sm"
              >
                <option value="">Select course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>Schedule Pattern</Label>
                <select value={schedulePattern} onChange={(e) => setSchedulePattern(e.target.value)} className="w-full h-10 px-3 border rounded-md text-sm">
                  <option value="MWF">MWF</option>
                  <option value="TTS">TTS</option>
                  <option value="WEEKEND">Weekend</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Time Slot</Label>
              <MasterSelect entityType="timeslots" value={timeSlot} onChange={setTimeSlot} placeholder="Select time slot" className="mt-1" />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(ROUTES.ADMIN.BATCHES.ALL)}>Cancel</Button>
              <Button type="submit" className="bg-[#1769AA] text-white" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</> : <><GraduationCap className="w-4 h-4 mr-2" /> Create Batch</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
