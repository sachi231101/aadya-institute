import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useBatches } from "@/hooks/useBatches";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { StudentAllocation } from "./StudentAllocation";
import { FacultyAllocation } from "./FacultyAllocation";

/** Standalone page: pick a batch then allocate students */
export const BatchStudentAllocationPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const { batches, loading } = useBatches();

  if (selectedBatchId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelectedBatchId("")}>← Back to batch list</Button>
        <StudentAllocation batchId={selectedBatchId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Student Allocation</h2>
        <p className="text-sm text-text-secondary">Select a batch to enroll or remove students.</p>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-2">
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : batches.length === 0 ? (
            <p className="text-sm text-text-secondary py-4">No batches found. Create a batch first.</p>
          ) : (
            batches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBatchId(b.id)}
                className="w-full text-left p-3 rounded-lg border hover:bg-blue-50/50 transition-colors"
              >
                <span className="font-semibold">{b.name}</span>
                <span className="text-xs text-text-secondary ml-2">{b.code}</span>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/** Standalone page: pick a batch then assign faculty */
export const BatchFacultyAllocationPage: React.FC = () => {
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const { batches, loading } = useBatches();

  if (selectedBatchId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelectedBatchId("")}>← Back to batch list</Button>
        <FacultyAllocation batchId={selectedBatchId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Faculty Allocation</h2>
        <p className="text-sm text-text-secondary">Select a batch to assign faculty.</p>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-2">
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : batches.length === 0 ? (
            <p className="text-sm text-text-secondary py-4">No batches found.</p>
          ) : (
            batches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBatchId(b.id)}
                className="w-full text-left p-3 rounded-lg border hover:bg-blue-50/50 transition-colors"
              >
                <span className="font-semibold">{b.name}</span>
                <span className="text-xs text-text-secondary ml-2">{b.code}</span>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
