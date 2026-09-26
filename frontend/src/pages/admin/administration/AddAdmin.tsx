import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotificationStore } from "@/store/notification.store";
import { useCreateUser } from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import { usePasswordRequirements } from "@/hooks/usePasswordRequirements";
import { usersApi } from "@/services/users.api";
import { facultyApi } from "@/services/faculty.api";
import { PermissionMatrix } from "@/components/permissions/PermissionMatrix";
import { PasswordRequirementsHint } from "@/components/forms/PasswordRequirementsHint";
import {
  buildPermissionsFromAccess,
  createDefaultAccessState,
  type ItemAccessState,
  type PermissionModuleDefinition,
} from "@/utils/permission-utils";
import {
  CENTER_ITEM_READ_PERMISSIONS,
  CENTER_ITEM_WRITE_PERMISSIONS,
} from "@/constants/center-item-permissions";
import {
  COUNSELOR_ITEM_READ_PERMISSIONS,
  COUNSELOR_ITEM_WRITE_PERMISSIONS,
} from "@/constants/counselor-item-permissions";
import {
  validatePasswordAgainstPolicy,
} from "@/utils/password-policy";
import { sanitizeMobileInput } from "@/utils/validation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const STAFF_ROLE_OPTIONS = [
  { value: "CENTER_MANAGER", label: "Center Manager" },
  { value: "COUNSELLOR", label: "Counsellor" },
  { value: "FACULTY", label: "Faculty" },
] as const;

const ROLE_SUCCESS_LABEL: Record<string, string> = {
  CENTER_MANAGER: "Center Manager",
  COUNSELLOR: "Counsellor",
  FACULTY: "Faculty",
};

const buildAddAdminSchema = (
  policy: Parameters<typeof validatePasswordAgainstPolicy>[1]
) =>
  z
    .object({
      name: z.string().min(2, "Name must be at least 2 characters."),
      email: z.string().email("Invalid email address."),
      phone: z
        .string()
        .min(1, "Phone number is required")
        .refine(
          (val) => {
            const digits = val.replace(/\D/g, "");
            return digits.length === 10;
          },
          {
            message: "Phone must be exactly 10 digits",
          }
        ),
      branchId: z.string().min(1, "Assigned branch is required"),
      role: z.enum(["CENTER_MANAGER", "COUNSELLOR", "FACULTY"]),
      password: z.string().min(1, "Password is required."),
      confirmPassword: z.string().min(1, "Password confirmation is required."),
    })
    .superRefine((data, ctx) => {
      const policyError = validatePasswordAgainstPolicy(data.password, policy);
      if (policyError) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: policyError,
          path: ["password"],
        });
      }
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords do not match",
          path: ["confirmPassword"],
        });
      }
    });

type AddAdminFormValues = z.infer<ReturnType<typeof buildAddAdminSchema>>;

const USERS_PATH = "/admin/administration/users";
const EMPTY_CATALOG: PermissionModuleDefinition[] = [];

export const AddAdmin: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const createUserMutation = useCreateUser();
  const { data: branchesResponse } = useBranches();
  const { policy } = usePasswordRequirements();

  const branches = branchesResponse?.data ?? [];
  const addAdminSchema = useMemo(() => buildAddAdminSchema(policy), [policy]);

  const form = useForm<AddAdminFormValues>({
    resolver: zodResolver(addAdminSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      branchId: "",
      role: "CENTER_MANAGER",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    form.clearErrors("password");
  }, [policy, form.clearErrors]);

  useEffect(() => {
    form.clearErrors();
  }, [addAdminSchema, form.clearErrors]);

  const selectedRole = form.watch("role");
  const showPermissions =
    selectedRole === "CENTER_MANAGER" || selectedRole === "COUNSELLOR";

  const { data: catalogRes } = useQuery({
    queryKey: ["permission-catalog", selectedRole],
    queryFn: () =>
      usersApi.getPermissionCatalog(
        selectedRole as "CENTER_MANAGER" | "COUNSELLOR"
      ),
    enabled: showPermissions,
  });
  const catalog: PermissionModuleDefinition[] = catalogRes?.data ?? EMPTY_CATALOG;

  const [itemAccess, setItemAccess] = useState<Record<string, ItemAccessState>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reset matrix only when role changes — not on every catalog query refetch
  // (refetch was wiping Grant all / Clear all selections).
  useEffect(() => {
    if (!showPermissions) {
      setItemAccess({});
      return;
    }
    if (catalog.length === 0) return;
    setItemAccess(createDefaultAccessState(catalog));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalog hydrate below
  }, [selectedRole, showPermissions]);

  useEffect(() => {
    if (!showPermissions || catalog.length === 0) return;
    setItemAccess((prev) => {
      if (Object.keys(prev).length === 0) {
        return createDefaultAccessState(catalog);
      }
      const catalogKeys = new Set(
        catalog.flatMap((m) => m.items.map((i) => i.key))
      );
      const prevKeys = Object.keys(prev);
      const shapeMismatch =
        prevKeys.some((k) => !catalogKeys.has(k)) ||
        [...catalogKeys].some((k) => !(k in prev));
      return shapeMismatch ? createDefaultAccessState(catalog) : prev;
    });
  }, [catalog, showPermissions]);

  const createFacultyMutation = useMutation({
    mutationFn: facultyApi.create,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["faculty"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["reports", "faculty"], refetchType: "all" }),
      ]);
    },
  });

  const isSubmitting =
    createUserMutation.isPending || createFacultyMutation.isPending;

  const onSubmit = (data: AddAdminFormValues) => {
    form.clearErrors("root");
    const sanitizedPhone = data.phone.replace(/\D/g, "").slice(0, 10);
    const roleLabel = ROLE_SUCCESS_LABEL[data.role] || data.role;

    const handleError = (err: any) => {
      const responseData = err?.response?.data;
      const fieldErrors = Array.isArray(responseData?.errors)
        ? (responseData.errors as { field?: string; message?: string }[])
        : [];
      const fieldMessage = fieldErrors
        .map((e) => e.message)
        .filter(Boolean)
        .join(". ");
      const message =
        fieldMessage ||
        responseData?.message ||
        err?.message ||
        "Failed to create user.";

      for (const e of fieldErrors) {
        const field = e.field;
        if (field === "email" || field === "phone" || field === "password" || field === "branchId") {
          form.setError(field as "email" | "phone" | "password" | "branchId", {
            type: "manual",
            message: e.message || message,
          });
        }
      }

      if (message.toLowerCase().includes("email") && !fieldErrors.length) {
        form.setError("email", { type: "manual", message });
      } else if (message.toLowerCase().includes("phone") && !fieldErrors.length) {
        form.setError("phone", { type: "manual", message });
      } else if (message.toLowerCase().includes("password") && !fieldErrors.length) {
        form.setError("password", { type: "manual", message });
      }

      form.setError("root", { type: "manual", message });
      addNotification(message, "error");
    };

    if (data.role === "FACULTY") {
      createFacultyMutation.mutate(
        {
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: sanitizedPhone,
          password: data.password,
          branchId: data.branchId,
        },
        {
          onSuccess: () => {
            addNotification(`${roleLabel} created successfully.`, "success");
            navigate(USERS_PATH);
          },
          onError: handleError,
        }
      );
      return;
    }

    const permissionMaps =
      data.role === "COUNSELLOR"
        ? { read: COUNSELOR_ITEM_READ_PERMISSIONS, write: COUNSELOR_ITEM_WRITE_PERMISSIONS }
        : { read: CENTER_ITEM_READ_PERMISSIONS, write: CENTER_ITEM_WRITE_PERMISSIONS };

    const permissions = buildPermissionsFromAccess(itemAccess, catalog, permissionMaps);
    const grantedModules = Object.values(itemAccess).some((a) => a?.show);
    if (
      grantedModules &&
      !permissions.some((p) => p.startsWith("item.") && !p.endsWith(".write"))
    ) {
      form.setError("root", {
        type: "manual",
        message:
          "Permissions could not be built from the matrix. Wait for the catalog to load, click Grant all again, then save.",
      });
      return;
    }

    createUserMutation.mutate(
      {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: sanitizedPhone,
        password: data.password,
        roles: [data.role],
        branchId: data.branchId || undefined,
        permissions,
      },
      {
        onSuccess: () => {
          addNotification(
            `${roleLabel} created successfully with module permissions.`,
            "success"
          );
          navigate(USERS_PATH);
        },
        onError: handleError,
      }
    );
  };

  return (
    <PageContainer maxWidth="narrow">
      <PageHeader
        title="Add User"
        description="Create a center manager, counsellor, or faculty account"
        actions={
          <Button
            variant="ghost"
            onClick={() => navigate(USERS_PATH)}
            size="icon"
          >
            <ArrowLeft size={20} />
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {form.formState.errors.root && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>{form.formState.errors.root.message}</span>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                Enter personal details, role, branch, and account credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="staff@aadya.in"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                        >
                          {STAFF_ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Branch *</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                        >
                          <option value="" disabled>
                            Select a branch
                          </option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name} ({branch.code})
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="9876543210"
                          inputMode="numeric"
                          maxLength={10}
                          {...field}
                          onChange={(e) =>
                            field.onChange(sanitizeMobileInput(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="hidden md:block" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="pr-9"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="pr-9"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={
                              showConfirmPassword
                                ? "Hide confirm password"
                                : "Show confirm password"
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <PasswordRequirementsHint />
            </CardContent>
          </Card>

          {showPermissions && (
            <Card className="border-blue-100/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 text-primary flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Module & Submodule Permissions
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      By default, new users see only Dashboard, ASK ME, and Settings.
                      Enable Read/Edit per submodule to grant access.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Default access:</strong> Unchecked modules stay hidden
                    until you enable Read. Use Grant all for full ERP access.
                  </span>
                </div>

                <PermissionMatrix
                  role={selectedRole as "CENTER_MANAGER" | "COUNSELLOR"}
                  value={itemAccess}
                  onChange={setItemAccess}
                  catalog={catalog}
                />

                <div className="mt-4 text-xs text-slate-400 font-medium">
                  Dashboard, ASK ME, and Settings are always available to active staff.
                </div>
              </CardContent>
            </Card>
          )}

          {selectedRole === "FACULTY" && (
            <Card className="border-border shadow-xs">
              <CardContent className="pt-5 text-sm text-muted-foreground">
                Faculty accounts get the Faculty role and a Faculty profile for
                scheduling and attendance. Additional HR details can be edited later
                from the Faculty module.
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(USERS_PATH)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-[#F39A16] text-white transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                `Create ${ROLE_SUCCESS_LABEL[selectedRole] || "User"}`
              )}
            </Button>
          </div>
        </form>
      </Form>
    </PageContainer>
  );
};
