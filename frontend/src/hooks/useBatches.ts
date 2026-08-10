import { useState, useEffect } from "react";
import type { Batch } from "../types/batch.types";
import { batchesApi } from "../services/batches.api";

export const useBatches = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    batchesApi
      .getAll()
      .then(setBatches)
      .catch(() => setBatches([]))
      .finally(() => setLoading(false));
  }, []);

  return { batches, loading };
};
