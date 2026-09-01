import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserCheck, AlertCircle } from "lucide-react";
import { batchesApi } from "@/services/batches.api";
import { useFacultyList } from "@/hooks/useFaculty";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  batchId: string;
}

export const FacultyAllocation: React.FC<Props> = ({ batchId }) => {
  const queryClient = useQueryClient();
  const [facultyId, setFacultyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: batchData, isLoading } = useQuery({
    queryKey: ["batches", batchId],
    queryFn: () => batchesApi.getById(batchId),
  });

  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const facultyList = facultyResponse?.data ?? [];
  const batch = batchData?.data;
  const currentFacultyId = batch?.facultyId || batch?.faculty?.id || "";

  const handleAssign = async () => {
    if (!facultyId) return;
    setLoading(true);
    setError(null);
    try {
      await batchesApi.assignFaculty(batchId, facultyId);
      queryClient.invalidateQueries({ queryKey: ["batches", batchId] });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to assign faculty");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin inline" /></div>;
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold">Faculty Assignment</h3>
        <p className="text-sm text-text-secondary">
          Current faculty: <strong>{batch?.faculty?.user?.name || "None assigned"}</strong>
        </p>
        {error && (
          <div className="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={facultyId || currentFacultyId}
            onChange={(e) => setFacultyId(e.target.value)}
            className="h-10 px-3 border rounded-md text-sm flex-1"
          >
            <option value="">Select faculty</option>
            {facultyList.map((f: { id: string; user?: { name?: string }; employeeCode?: string }) => (
              <option key={f.id} value={f.id}>{f.user?.name} ({f.employeeCode})</option>
            ))}
          </select>
          <Button onClick={handleAssign} disabled={!facultyId || loading} className="bg-[#1769AA] text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserCheck className="w-4 h-4 mr-2" /> Assign Faculty</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FacultyAllocation;
