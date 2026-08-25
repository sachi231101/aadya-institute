import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNotificationStore } from "@/store/notification.store";
import {
  useUser,
  useUpdateUser,
  useUpdateUserPermissions,
} from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  CheckSquare,
  Square,
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
import {
  MODULE_OPTIONS,
  ALL_MODULE_KEYS,
} from "@/constants/module-permissions";

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

  // Selected module permissions
  const [selectedModules, setSelectedModules] = useState<string[]>(ALL_MODULE_KEYS);

  const toggleModule = (moduleKey: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((k) => k !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  const handleSelectAll = () => setSelectedModules([...ALL_MODULE_KEYS]);
  const handleDeselectAll = () => setSelectedModules([]);

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

      // Populate user's active module permissions
      if (admin.modulePermissions && admin.modulePermissions.length > 0) {
        setSelectedModules(admin.modulePermissions);
      } else if (admin.roles.includes("CENTER_MANAGER")) {
        // Fallback default for existing accounts
        setSelectedModules([...ALL_MODULE_KEYS]);
      }
    }
  }, [admin, form]);

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
      // 1. Update basic profile info
      await updateUserMutation.mutateAsync({
        id,
        data: {
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          branchId: data.branchId || null,
        },
      });

      // 2. If center manager, update module permissions
      if (isCenterManager) {
        await updatePermissionsMutation.mutateAsync({
          id,
          data: {
            modulePermissions: selectedModules,
          },
        });
      }

      addNotification("Administrator & permissions updated successfully.", "success");
      navigate("/administration");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update administrator.";
      addNotification(message, "error");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
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
          {/* ─── Profile Details Card ─────────────────────────────────── */}
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

          {/* ─── Module Permissions Card (Only for Center Managers) ───── */}
          {isCenterManager && (
            <Card className="border-blue-100/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 text-[#1769AA] flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Module Permissions
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Configure which modules this Central Manager is authorized to access and manage
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-8 text-xs font-semibold text-[#1769AA] hover:bg-blue-50 border-blue-200"
                    >
                      <CheckSquare className="h-3.5 w-3.5 mr-1" /> Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="h-8 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <Square className="h-3.5 w-3.5 mr-1" /> Deselect All
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Dynamic Access:</strong> When saved, the Center Manager's portal navigation will instantly update to show only the selected modules.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {MODULE_OPTIONS.map((module) => {
                    const isChecked = selectedModules.includes(module.key);
                    const Icon = module.icon;

                    return (
                      <div
                        key={module.key}
                        onClick={() => toggleModule(module.key)}
                        className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                          isChecked
                            ? "bg-blue-50/40 border-[#1769AA]/40 shadow-2xs hover:border-[#1769AA]"
                            : "bg-white border-slate-200/80 opacity-75 hover:opacity-100 hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        {/* Checkbox visual */}
                        <div
                          className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            isChecked
                              ? "bg-[#1769AA] border-[#1769AA] text-white"
                              : "border-slate-300 bg-white group-hover:border-slate-400"
                          }`}
                        >
                          {isChecked && (
                            <svg
                              className="h-3.5 w-3.5 stroke-current"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>

                        {/* Icon */}
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? "bg-blue-100 text-[#1769AA]"
                              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70"
                          }`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-sm font-bold truncate ${
                                isChecked ? "text-slate-900" : "text-slate-700"
                              }`}
                            >
                              {module.label}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              {module.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                            {module.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Actions Footer ───────────────────────────────────────── */}
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
