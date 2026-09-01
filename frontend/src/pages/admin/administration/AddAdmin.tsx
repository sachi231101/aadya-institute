import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { useNotificationStore } from "@/store/notification.store";
import { useCreateUser } from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import { usersApi } from "@/services/users.api";
import { PermissionMatrix } from "@/components/permissions/PermissionMatrix";
import {
  buildPermissionsFromAccess,
  createDefaultAccessState,
  type ItemAccessState,
  type PermissionModuleDefinition,
} from "@/utils/permission-utils";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

const addAdminSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    phone: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (val) => {
          if (!val || val.trim() === "") return true;
          const digits = val.replace(/\D/g, "");
          return digits.length >= 7 && digits.length <= 15;
        },
        {
          message: "Phone must be a valid phone number (7-15 digits)",
        }
      ),
    branchId: z.string().min(1, "Assigned branch is required"),
    role: z.string().default("CENTER_MANAGER"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[0-9]/, "Password must contain at least one number."),
    confirmPassword: z.string().min(1, "Password confirmation is required."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type AddAdminFormValues = z.infer<typeof addAdminSchema>;

export const AddAdmin: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const createUserMutation = useCreateUser();
  const { data: branchesResponse } = useBranches();

  const branches = branchesResponse?.data ?? [];

  const { data: catalogRes } = useQuery({
    queryKey: ["permission-catalog", "CENTER_MANAGER"],
    queryFn: () => usersApi.getPermissionCatalog("CENTER_MANAGER"),
  });
  const catalog: PermissionModuleDefinition[] = catalogRes?.data ?? [];

  const [itemAccess, setItemAccess] = useState<Record<string, ItemAccessState>>({});

  useEffect(() => {
    if (catalog.length > 0 && Object.keys(itemAccess).length === 0) {
      setItemAccess(createDefaultAccessState(catalog));
    }
  }, [catalog, itemAccess]);

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

  const onSubmit = (data: AddAdminFormValues) => {
    form.clearErrors("root");
    const sanitizedPhone = data.phone?.trim() ? data.phone.trim() : undefined;

    const permissions = buildPermissionsFromAccess(itemAccess, catalog);

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
          addNotification("Center Manager created successfully with module permissions.", "success");
          navigate("/administration");
        },
        onError: (err: any) => {
          const message =
            err?.response?.data?.message ||
            err?.message ||
            "Failed to create administrator.";

          if (message.toLowerCase().includes("email")) {
            form.setError("email", { type: "manual", message });
          } else if (message.toLowerCase().includes("phone")) {
            form.setError("phone", { type: "manual", message });
          }

          form.setError("root", { type: "manual", message });
          addNotification(message, "error");
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/administration")}
          size="icon"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Add Center Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a new center manager account and configure their module access
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {form.formState.errors.root && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>{form.formState.errors.root.message}</span>
            </div>
          )}

          {/* ─── Profile Details Card ─────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                Enter the personal and account credentials for the new center manager.
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
                          placeholder="admin@aadya.in"
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="9876543210" {...field} />
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
                          <option value="" disabled>Select a branch</option>
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
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
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-[#1769AA] flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Module & Submodule Permissions
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    By default, new managers see only Dashboard, ASK ME, and Settings. Enable Show/Editable per submodule to grant access.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-5">
              <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Default access:</strong> Unchecked modules stay hidden until you enable Show. Use Grant all for full ERP access.
                </span>
              </div>

              <PermissionMatrix
                role="CENTER_MANAGER"
                value={itemAccess}
                onChange={setItemAccess}
              />

              <div className="mt-4 text-xs text-slate-400 font-medium">
                Dashboard, ASK ME, and Settings are always available to active managers.
              </div>
            </CardContent>
          </Card>

          {/* ─── Action Footer ────────────────────────────────────────── */}
          <div className="flex justify-end gap-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/administration")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#1769AA] hover:bg-[#F39A16] text-white transition-colors"
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create Center Manager"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
