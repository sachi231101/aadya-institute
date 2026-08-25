import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNotificationStore } from "@/store/notification.store";
import { useCreateUser } from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
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
    branchId: z.string().optional().or(z.literal("")),
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

  // Selected module permissions state (default: all checked)
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

    if (selectedModules.length === 0) {
      form.setError("root", {
        type: "manual",
        message: "Please select at least one module permission for the Center Manager.",
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
        modulePermissions: selectedModules,
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

          {/* ─── Module Permissions Card ─────────────────────────────── */}
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
                      Select which modules this Central Manager is authorized to access and manage
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
                  <strong>Dynamic Access:</strong> Only the checked modules will appear in the Center Manager's navigation sidebar and portal pages.
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

              <div className="mt-4 text-xs text-slate-400 font-medium">
                * Note: Dashboard, ASK ME, Settings, and Notifications are core utilities and always available to active managers.
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
