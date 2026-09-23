import React, { useEffect } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateLead } from "@/hooks/useLeads";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { useBranches } from "@/hooks/useBranches";
import { useCourses } from "@/hooks/useCourses";
import { MasterSelect } from "@/components/common/MasterSelect";
import { SearchableSelect } from "@/components/common/SearchableSelect";

export const leadCreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[0-9+\s-]{10,15}$/, "Please enter a valid phone number"),
  interestedIn: z.string().min(1, "Interest or course name is required").trim(),
  courseId: z.string().optional().or(z.literal("")),
  sourceMasterId: z.string().optional().or(z.literal("")),
  priority: z.string().default("MEDIUM"),
  branchId: z.string().min(1, "Branch is required"),
  notes: z.string().optional().or(z.literal("")),
});

export type LeadCreateFormValues = z.infer<typeof leadCreateSchema>;

type LeadCreateFormProps = {
  onSuccess?: (payload: { leadId?: string; name: string }) => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  className?: string;
  /** Extra note under the form (e.g. AI call queue hint). */
  footerHint?: React.ReactNode;
};

export const LeadCreateForm: React.FC<LeadCreateFormProps> = ({
  onSuccess,
  onCancel,
  submitLabel = "Create Lead",
  cancelLabel = "Cancel",
  className,
  footerHint,
}) => {
  const { user } = useAuthStore();
  const { selectedBranchId } = useBranchStore();
  const createLeadMutation = useCreateLead();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const { courses } = useCourses();
  const branches = branchesResponse?.data || [];

  const defaultBranch =
    user?.branchId ||
    (selectedBranchId !== "ALL" ? selectedBranchId : "") ||
    (branches.length > 0 ? branches[0].id : "");

  const form = useForm<LeadCreateFormValues>({
    resolver: zodResolver(leadCreateSchema) as any,
    defaultValues: {
      name: "",
      phoneNumber: "",
      interestedIn: "",
      courseId: "",
      sourceMasterId: "",
      priority: "MEDIUM",
      branchId: defaultBranch,
      notes: "",
    },
  });

  useEffect(() => {
    if (!form.getValues("branchId") && defaultBranch) {
      form.setValue("branchId", defaultBranch);
    }
  }, [defaultBranch, form]);

  const onSubmit = (data: LeadCreateFormValues) => {
    const isCounsellorOnly =
      Boolean(user?.roles?.includes("COUNSELLOR")) &&
      !user?.roles?.includes("ADMIN") &&
      !user?.roles?.includes("CENTER_MANAGER");

    createLeadMutation.mutate(
      {
        name: data.name,
        phoneNumber: data.phoneNumber,
        interestedIn: data.interestedIn,
        courseId: data.courseId || undefined,
        sourceMasterId: data.sourceMasterId || undefined,
        priority: data.priority,
        branchId: data.branchId,
        notes: data.notes || undefined,
        // Backend also enforces this; send for clarity when counsellor creates.
        ...(isCounsellorOnly && user?.id
          ? { assignedCounsellorId: user.id }
          : {}),
      },
      {
        onSuccess: (res: { data?: { id?: string } }) => {
          onSuccess?.({ leadId: res?.data?.id, name: data.name });
        },
        onError: (err: unknown) => {
          const data = (err as { response?: { data?: Record<string, unknown> } })?.response
            ?.data;
          const msg =
            (typeof data?.message === "string" && data.message) || "Failed to create lead";
          const errors = data?.errors;
          if (Array.isArray(errors) && errors.length > 0) {
            const details = errors
              .map((e) => {
                if (!e || typeof e !== "object") return "";
                const row = e as { field?: string; message?: string };
                return `${row.field ? row.field + ": " : ""}${row.message || ""}`;
              })
              .filter(Boolean)
              .join(", ");
            form.setError("root", {
              message: details ? `${msg} (${details})` : msg,
            });
          } else {
            form.setError("root", { message: msg });
          }
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className ?? "space-y-5"}>
        {form.formState.errors.root && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{form.formState.errors.root.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Rahul Sharma" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 9876543210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interestedIn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interested In *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Full Stack Web Development" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="courseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matched Course</FormLabel>
                <SearchableSelect
                  value={field.value || ""}
                  onChange={(courseId) => {
                    field.onChange(courseId);
                    const selectedCourse = courses.find((course) => course.id === courseId);
                    if (selectedCourse && !form.getValues("interestedIn")) {
                      form.setValue("interestedIn", selectedCourse.name);
                    }
                  }}
                  options={courses.map((course) => ({
                    value: course.id,
                    label: course.code ? `${course.name} (${course.code})` : course.name,
                  }))}
                  placeholder="Search course"
                  emptyLabel="No course found"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch *</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full h-9 px-3 rounded-md border border-border text-sm bg-background"
                  >
                    <option value="">Select branch</option>
                    {branches.map((b: { id: string; name: string; code: string }) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
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
            name="sourceMasterId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lead Source</FormLabel>
                <FormControl>
                  <MasterSelect
                    entityType="leadsource"
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Select Lead Source"
                    className="mt-0 rounded-md"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full h-9 px-3 rounded-md border border-border text-sm bg-background"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  placeholder="Any additional notes about this lead..."
                  className="w-full h-20 px-3 py-2 rounded-md border border-border text-sm bg-background resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {footerHint ? <div className="text-xs text-muted-foreground">{footerHint}</div> : null}

        <div className="flex gap-3 pt-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button type="submit" disabled={createLeadMutation.isPending}>
            {createLeadMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Creating...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
