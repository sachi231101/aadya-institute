import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { useNotificationStore } from "@/store/notification.store";
import {
  useUser,
  useUpdateUser,
  useUpdateUserPermissions,
} from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import { usersApi } from "@/services/users.api";
import { PermissionMatrix } from "@/components/permissions/PermissionMatrix";
import {
  buildPermissionsFromAccess,
  permissionsToAccessState,
  createDefaultAccessState,
  type ItemAccessState,
  type PermissionModuleDefinition,
} from "@/utils/permission-utils";
import {
  ArrowLeft,
  Loader2,
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

const editAdminSchema = z.object({
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
  branchId: z.string().optional().or(z.literal("")),
});

type EditAdminFormValues = z.infer<typeof editAdminSchema>;

export const EditAdmin: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { data: userResponse, isLoading, isError } = useUser(id);
  const updateUserMutation = useUpdateUser();
  const updatePermissionsMutation = useUpdateUserPermissions();
  const { data: branchesResponse } = useBranches();

  const admin = userResponse?.data;
  const branches = branchesResponse?.data ?? [];

  const { data: catalogRes } = useQuery({
    queryKey: ["permission-catalog", "CENTER_MANAGER"],
    queryFn: () => usersApi.getPermissionCatalog("CENTER_MANAGER"),
    enabled: Boolean(admin?.roles.includes("CENTER_MANAGER")),
  });
  const catalog: PermissionModuleDefinition[] = catalogRes?.data ?? [];

  const [itemAccess, setItemAccess] = useState<Record<string, ItemAccessState>>({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const form = useForm<EditAdminFormValues>({
    resolver: zodResolver(editAdminSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      branchId: "",
    },
  });

  useEffect(() => {
    if (admin) {
      form.reset({
        name: admin.name,
        email: admin.email || "",
        phone: admin.phone || "",
        branchId: admin.branchId || "",
      });
      setPermissionsLoaded(false);
    }
  }, [admin, form]);

  useEffect(() => {
    if (!admin || catalog.length === 0 || permissionsLoaded) return;

    if (admin.permissions) {
      setItemAccess(permissionsToAccessState(admin.permissions, catalog));
    } else {
      setItemAccess(createDefaultAccessState(catalog));
    }
    setPermissionsLoaded(true);
  }, [admin, catalog, permissionsLoaded]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#1769AA]" />
          <span className="ml-3 text-slate-600 font-medium">Loading administrator...</span>
        </div>
      </div>
    );
  }

  if (isError || !admin) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/administration")}
          className="mb-4"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to Administrators
        </Button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-bold text-text-primary">
            Administrator Not Found
          </h2>
          <p className="text-muted-foreground mt-2">
            The administrator you are trying to edit does not exist.
          </p>
        </div>
      </div>
    );
  }

  const isCenterManager = admin.roles.includes("CENTER_MANAGER");
  const isSaving =
    updateUserMutation.isPending || updatePermissionsMutation.isPending;

  const onSubmit = async (data: EditAdminFormValues) => {
    if (!id) return;

    try {
      await updateUserMutation.mutateAsync({
        id,
        data: {
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          branchId: data.branchId || null,
        },
      });

      if (isCenterManager) {
        const permissions = buildPermissionsFromAccess(itemAccess, catalog);
        await updatePermissionsMutation.mutateAsync({
          id,
          data: { permissions },
        });
      }

      addNotification("Administrator & permissions updated successfully.", "success");
      navigate("/administration");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Failed to update administrator.";
      addNotification(message, "error");
    }
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
            Edit Administrator
          </h1>
          <p className="text-muted-foreground mt-1">
            Update profile information and module permissions for {admin.name}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                Make changes to the administrator's profile here. Password resets are handled separately in the View screen.
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
                      <FormLabel>Assigned Branch</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                        >
                          <option value="">No branch (Institute-wide)</option>
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
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Current Role
                  </label>
                  <div className="mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800">
                    {admin.roles.join(", ") || "No role assigned"}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Account Status
                  </label>
                  <div className="mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800">
                    {admin.status}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isCenterManager && (
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
                      By default, managers see only Dashboard, ASK ME, and Settings. Enable Show/Editable per submodule to grant portal access.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Default access:</strong> Unchecked modules stay hidden until you enable Show. Changes apply live to the manager&apos;s portal.
                  </span>
                </div>

                <PermissionMatrix
                  role="CENTER_MANAGER"
                  value={itemAccess}
                  onChange={setItemAccess}
                  disabled={isSaving}
                />
              </CardContent>
            </Card>
          )}

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
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
