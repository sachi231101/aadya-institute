import { useState, useEffect, useCallback, useRef } from "react";
import { modulesApi, type ModuleData, type CreateModulePayload, type AddTopicPayload } from "../services/modules.api";

export const useModules = (courseId?: string) => {
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchModules = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!courseId) {
      setModules([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Drop prior course modules immediately so UI never mixes catalogs.
      setModules([]);
      const response = await modulesApi.getByCourse(courseId);
      if (requestId !== requestIdRef.current) return;
      setModules(response.data || []);
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      setModules([]);
      setError(err.response?.data?.message || err.message || "Failed to fetch modules");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [courseId]);

  useEffect(() => {
    void fetchModules();
    return () => {
      // Invalidate in-flight responses when courseId changes or unmounts.
      requestIdRef.current += 1;
    };
  }, [fetchModules]);

  const createModule = async (payload: CreateModulePayload) => {
    const response = await modulesApi.create(payload);
    await fetchModules();
    return response.data;
  };

  const addTopic = async (moduleId: string, payload: AddTopicPayload) => {
    const response = await modulesApi.addTopic(moduleId, payload);
    await fetchModules();
    return response.data;
  };

  const toggleTopic = async (moduleId: string, topicId: string) => {
    const response = await modulesApi.toggleTopic(moduleId, topicId);
    await fetchModules();
    return response.data;
  };

  const deleteTopic = async (moduleId: string, topicId: string) => {
    const response = await modulesApi.deleteTopic(moduleId, topicId);
    await fetchModules();
    return response.data;
  };

  const deleteModule = async (id: string) => {
    await modulesApi.delete(id);
    await fetchModules();
  };

  return {
    modules,
    loading,
    error,
    refetch: fetchModules,
    createModule,
    addTopic,
    toggleTopic,
    deleteTopic,
    deleteModule,
  };
};
