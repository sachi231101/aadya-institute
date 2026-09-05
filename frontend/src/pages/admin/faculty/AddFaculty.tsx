import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateFaculty } from "../../../hooks/useFaculty";
import { useBranches } from "../../../hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";
import { usePasswordRequirements } from "@/hooks/usePasswordRequirements";
import { MasterSelect } from "@/components/common/MasterSelect";
import { PasswordRequirementsHint } from "@/components/forms/PasswordRequirementsHint";
import { useNumberingSeriesPreview } from "@/hooks/useMasters";
import { validatePasswordAgainstPolicy } from "@/utils/password-policy";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, UserPlus, Save, Loader2, RefreshCw } from "lucide-react";

const buildFacultySchema = (
  policy: Parameters<typeof validatePasswordAgainstPolicy>[1]
) =>
  z.object({
    employeeCode: z.string().max(20).optional().or(z.literal("")),
    name: z.string().min(2, "Full Name is required"),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
    password: z
      .string()
      .min(1, "Password is required")
      .superRefine((val, ctx) => {
        const err = validatePasswordAgainstPolicy(val, policy);
        if (err) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
        }
      }),
    specialization: z.string().optional().or(z.literal("")),
    branchId: z.string().min(1, "Branch is required"),
    designationMasterId: z.string().optional().or(z.literal("")),
    qualificationMasterId: z.string().optional().or(z.literal("")),
  });

type FacultyFormValues = z.infer<ReturnType<typeof buildFacultySchema>>;

export const AddFaculty: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createMutation = useCreateFaculty();
  const { data: branchesResponse, isLoading: branchesLoading } = useBranches({ limit: 100, status: "ACTIVE" });
  const { user } = useAuthStore();
  const isCenterManager = user?.role === "CENTER_MANAGER";
  const { policy } = usePasswordRequirements();
  const facultySchema = useMemo(() => buildFacultySchema(policy), [policy]);

  const { data: employeeSeriesData, refetch: refetchEmployeePreview, isLoading: isEmployeePreviewLoading } =
    useNumberingSeriesPreview("EMPLOYEE");
  const [employeeCodeManuallyEdited, setEmployeeCodeManuallyEdited] = useState(false);

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : "/admin";

  const branches = branchesResponse?.data ?? [];

  const form = useForm<FacultyFormValues>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
      employeeCode: "",
      name: "",
      email: "",
      phone: "",
      password: "",
      specialization: "",
      branchId: isCenterManager && user?.branchId ? user.branchId : "",
      designationMasterId: "",
      qualificationMasterId: "",
    },
  });

  useEffect(() => {
    if (employeeCodeManuallyEdited) return;
    if (employeeSeriesData?.data?.preview) {
      form.setValue("employeeCode", employeeSeriesData.data.preview);
    }
  }, [employeeSeriesData, form, employeeCodeManuallyEdited]);

  const generateNewCode = async () => {
    setEmployeeCodeManuallyEdited(false);
    const result = await refetchEmployeePreview();
    const preview = result.data?.data?.preview;
    if (preview) {
      form.setValue("employeeCode", preview);
    }
  };

  const onSubmit = async (data: FacultyFormValues) => {
    try {
      const trimmedCode = data.employeeCode?.trim();
      const previewCode = employeeSeriesData?.data?.preview;
      const shouldAutoAssign =
        !trimmedCode ||
        !employeeCodeManuallyEdited ||
        (previewCode && trimmedCode.toUpperCase() === previewCode.toUpperCase());

      await createMutation.mutateAsync({
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        password: data.password,
        employeeCode: shouldAutoAssign ? undefined : trimmedCode?.toUpperCase(),
        specialization: data.specialization || undefined,
        branchId: data.branchId,
        designationMasterId: data.designationMasterId || undefined,
        qualificationMasterId: data.qualificationMasterId || undefined,
      });
      navigate(`${basePath}/faculty/all`);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to create faculty member.";
      form.setError("root", { message });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`${basePath}/faculty/all`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Add New Faculty</h2>
          <p className="text-sm text-text-secondary">
            Register a new professor or technical instructor. Employee Code comes from Master Setup numbering series.
          </p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#1769AA]" />
            Faculty Information
          </CardTitle>
          <CardDescription>
            Employee Code is auto-generated from the EMPLOYEE numbering series in Master Setup.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {form.formState.errors.root && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                  {form.formState.errors.root.message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="employeeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between gap-2">
                        <span>Employee Code</span>
                        <button
                          type="button"
                          onClick={generateNewCode}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1769AA] hover:underline"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Refresh from Master
                        </button>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            isEmployeePreviewLoading
                              ? "Loading next number from Master..."
                              : employeeSeriesData?.data?.preview ||
                                "Configure EMPLOYEE series in Master Setup"
                          }
                          {...field}
                          onChange={(e) => {
                            setEmployeeCodeManuallyEdited(true);
                            field.onChange(e);
                          }}
                          className="font-mono font-medium text-slate-800 uppercase"
                        />
                      </FormControl>
                      {employeeSeriesData?.data?.preview && (
                        <p className="text-[10px] text-slate-500 font-medium">
                          Next from Master:{" "}
                          <span className="font-mono text-[#1769AA]">
                            {employeeSeriesData.data.preview}
                          </span>
                          {" "}
                          (counter #{employeeSeriesData.data.currentSequence} → #
                          {employeeSeriesData.data.nextSequence})
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Dr. Rajesh Verma" {...field} />
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
                        <Input type="email" placeholder="e.g. rajesh.v@aadyainstitute.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. +91 9876543201" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Must meet security policy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2">
                  <PasswordRequirementsHint />
                </div>

                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch *</FormLabel>
                      <FormControl>
                        {isCenterManager ? (
                          <Input
                            value={branches.find((b) => b.id === field.value)?.name || field.value}
                            disabled
                            className="bg-slate-100 text-slate-700 font-medium"
                          />
                        ) : (
                          <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#1769AA] focus:ring-offset-2"
                            {...field}
                            disabled={branchesLoading}
                          >
                            <option value="">Select a branch</option>
                            {branches.map((branch) => (
                              <option key={branch.id} value={branch.id}>
                                {branch.name} ({branch.code})
                              </option>
                            ))}
                          </select>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject / Specialization</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Full Stack MERN Architecture" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="designationMasterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <FormControl>
                        <MasterSelect
                          entityType="designation"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Select Designation"
                          className="mt-0 rounded-md h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qualificationMasterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification</FormLabel>
                      <FormControl>
                        <MasterSelect
                          entityType="education"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Select qualification"
                          className="mt-0 rounded-md h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`${basePath}/faculty/all`)}
                  disabled={createMutation.isPending}
                  className="px-5 font-medium transition-colors"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white font-medium px-6 py-2 shadow-sm transition-colors flex items-center gap-2"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Faculty</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
