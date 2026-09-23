import { useState, useEffect, useCallback } from "react";
import { batchesApi, type BatchData, type CreateBatchPayload } from "../services/batches.api";

export const useBatches = (filters?: {
  search?: string;
  courseId?: string;
  facultyId?: string;
  status?: string;
  branchId?: string;
}) => {
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Destructure to primitive deps so inline `{ branchId }` objects from callers
  // cannot recreate fetchBatches every render (refetch storms → 429).
  const search = filters?.search;
  const courseId = filters?.courseId;
  const facultyId = filters?.facultyId;
  const status = filters?.status;
  const branchId = filters?.branchId;

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await batchesApi.getAll({
        search,
        courseId,
        facultyId,
        status,
        branchId,
      });
      setBatches(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch batches");
    } finally {
      setLoading(false);
    }
  }, [search, courseId, facultyId, status, branchId]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const createBatch = async (payload: CreateBatchPayload) => {
    const response = await batchesApi.create(payload);
    await fetchBatches();
    return response.data;
  };

  const updateBatch = async (id: string, payload: Partial<CreateBatchPayload> & { status?: string }) => {
    await batchesApi.update(id, payload);
    await fetchBatches();
  };

  const deleteBatch = async (id: string) => {
    await batchesApi.delete(id);
    await fetchBatches();
  };

  return {
    batches,
    loading,
    error,
    refetch: fetchBatches,
    createBatch,
    updateBatch,
    deleteBatch,
  };
};
