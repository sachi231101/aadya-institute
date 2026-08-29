import { useState, useEffect, useCallback } from "react";
import { modulesApi, type ModuleData, type CreateModulePayload, type AddTopicPayload } from "../services/modules.api";

export const useModules = (courseId?: string) => {
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModules = useCallback(async () => {
    if (!courseId) {
      setModules([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await modulesApi.getByCourse(courseId);
      setModules(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch modules");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchModules();
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
