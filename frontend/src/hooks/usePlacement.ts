import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { placementApi, type PlacementQueryParams } from "../services/placement.api";

export const PLACEMENT_KEYS = {
  eligible: (params?: PlacementQueryParams) => ["placement", "eligible", params] as const,
  companies: (params?: PlacementQueryParams) => ["placement", "companies", params] as const,
  jobs: (params?: PlacementQueryParams) => ["placement", "jobs", params] as const,
  applications: (params?: PlacementQueryParams) => ["placement", "applications", params] as const,
  interviews: (params?: PlacementQueryParams) => ["placement", "interviews", params] as const,
  placements: (params?: PlacementQueryParams) => ["placement", "placements", params] as const,
};

export const useEligibleStudents = (params?: PlacementQueryParams) => {
  return useQuery({
    queryKey: PLACEMENT_KEYS.eligible(params),
    queryFn: () => placementApi.getEligibleStudents(params),
  });
};

export const usePlacementCompanies = (params?: PlacementQueryParams) => {
  return useQuery({
    queryKey: PLACEMENT_KEYS.companies(params),
    queryFn: () => placementApi.listCompanies(params),
  });
};

export const usePlacementJobs = (params?: PlacementQueryParams) => {
  return useQuery({
    queryKey: PLACEMENT_KEYS.jobs(params),
    queryFn: () => placementApi.listJobs(params),
  });
};

export const usePlacementApplications = (params?: PlacementQueryParams) => {
  return useQuery({
    queryKey: PLACEMENT_KEYS.applications(params),
    queryFn: () => placementApi.listApplications(params),
  });
};

export const usePlacementInterviews = (params?: PlacementQueryParams) => {
  return useQuery({
    queryKey: PLACEMENT_KEYS.interviews(params),
    queryFn: () => placementApi.listInterviews(params),
  });
};

export const usePlacements = (params?: PlacementQueryParams) => {
  return useQuery({
    queryKey: PLACEMENT_KEYS.placements(params),
    queryFn: () => placementApi.listPlacements(params),
  });
};

export const useCreatePlacementCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: placementApi.createCompany,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["placement"] }),
  });
};

export const useCreatePlacementJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: placementApi.createJob,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["placement"] }),
  });
};

export const useCreatePlacementApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: placementApi.createApplication,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["placement"] }),
  });
};

export const useUpdatePlacementJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      placementApi.updateJob(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["placement"] }),
  });
};

export const useUpdatePlacementApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      placementApi.updateApplication(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["placement"] }),
  });
};

export const useCreatePlacementInterview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: placementApi.createInterview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["placement"] }),
  });
};

export const useUpdatePlacementInterview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      placementApi.updateInterview(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["placement"] }),
  });
};

export const useCreatePlacement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: placementApi.createPlacement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["placement"] }),
  });
};

export const useUpdatePlacement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      placementApi.updatePlacement(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["placement"] }),
  });
};

export const usePlacementSummary = () => {
  return useQuery({
    queryKey: ["placement", "summary"],
    queryFn: async () => {
      const [eligibleRes, placementsRes] = await Promise.all([
        placementApi.getEligibleStudents({ page: 1, limit: 1 }),
        placementApi.listPlacements({ page: 1, limit: 1 }),
      ]);
      return {
        eligibleCount: eligibleRes?.meta?.total ?? eligibleRes?.data?.meta?.total ?? 0,
        placedCount: placementsRes?.meta?.total ?? placementsRes?.data?.meta?.total ?? 0,
      };
    },
  });
};
