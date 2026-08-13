import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  usersApi,
  type UserListParams,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UpdateUserStatusPayload,
} from "@/services/users.api";

const USERS_KEY = "users";

/**
 * Fetch users with admin/management roles for the Admin Panel.
 * Fetches both ADMIN and CENTER_MANAGER users.
 */
export const useAdminUsers = (params?: UserListParams) => {
  return useQuery({
    queryKey: [USERS_KEY, "admin", params],
    queryFn: () => usersApi.getUsers({ limit: 50, ...params }),
  });
};

/**
 * Fetch all users (any role) — for general user management.
 */
export const useUsers = (params?: UserListParams) => {
  return useQuery({
    queryKey: [USERS_KEY, params],
    queryFn: () => usersApi.getUsers(params),
  });
};

/**
 * Fetch a single user by ID.
 */
export const useUser = (id: string | undefined) => {
  return useQuery({
    queryKey: [USERS_KEY, id],
    queryFn: () => usersApi.getUserById(id!),
    enabled: !!id,
  });
};

/**
 * Create a new user (admin).
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserPayload) => usersApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
};

/**
 * Update user details.
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) =>
      usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
};

/**
 * Update user status (activate / deactivate).
 */
export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserStatusPayload }) =>
      usersApi.updateUserStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
};

/**
 * Delete a user (soft-delete).
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
};
