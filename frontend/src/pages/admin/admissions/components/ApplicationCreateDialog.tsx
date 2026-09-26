import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { MasterSelect } from "@/components/common/MasterSelect";
import {
  applicationCreateSchema,
  type ApplicationCreateFormValues,
} from "../application-create.schema";
import { sanitizeMobileInput } from "@/utils/validation";

type CourseOption = { id: string; name: string };
type BranchOption = { id: string; name: string };

export type LeadPrefill = {
  id: string;
  name: string;
  phone?: string;
  email?: string | null;
  courseId?: string | null;
  notes?: string | null;
  branchId?: string | null;
};

interface ApplicationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: CourseOption[];
  branches: BranchOption[];
  requireBranch: boolean;
  leadPrefill?: LeadPrefill | null;
  leadBasePath?: string;
  isSubmitting: boolean;
  serverError?: string | null;
  onSubmit: (values: ApplicationCreateFormValues) => Promise<void>;
}

export function ApplicationCreateDialog({
  open,
  onOpenChange,
  courses,
  branches,
  requireBranch,
  leadPrefill,
  leadBasePath = "/admin/leads",
  isSubmitting,
  serverError,
  onSubmit,
}: ApplicationCreateDialogProps) {
  const form = useForm<ApplicationCreateFormValues>({
    resolver: zodResolver(applicationCreateSchema),
    defaultValues: {
      applicantName: "",
      phone: "",
      email: "",
      courseId: "",
      branchId: "",
      feeStatus: "PAID",
      applicationFee: undefined,
      paymentModeMasterId: "",
      paymentRef: "",
      notes: "",
      leadId: undefined,
    },
  });

  const feeStatus = form.watch("feeStatus");

  useEffect(() => {
    if (!open) return;
    form.reset({
      applicantName: leadPrefill?.name || "",
      phone: leadPrefill?.phone || "",
      email: leadPrefill?.email || "",
      courseId: leadPrefill?.courseId || "",
      branchId: leadPrefill?.branchId || "",
      feeStatus: "PAID",
      applicationFee: undefined,
      paymentModeMasterId: "",
      paymentRef: "",
      notes: leadPrefill?.notes || "",
      leadId: leadPrefill?.id,
    });
  }, [open, leadPrefill, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Admission Application</DialogTitle>
          <DialogDescription>
            Log applicant into application workflow before admission
          </DialogDescription>
        </DialogHeader>

        {leadPrefill && (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Source: </span>
            <Link
              to={`${leadBasePath}/${leadPrefill.id}`}
              className="font-medium text-primary hover:underline"
            >
              Lead — {leadPrefill.name}
            </Link>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="applicantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Applicant Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ananya Sharma" {...field} className="h-10 text-xs" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="9876543210"
                        inputMode="numeric"
                        maxLength={10}
                        {...field}
                        onChange={(e) =>
                          field.onChange(sanitizeMobileInput(e.target.value))
                        }
                        className="h-10 text-xs"
                      />
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
                        type="email"
                        placeholder="applicant@email.com"
                        {...field}
                        className="h-10 text-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Course *</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full h-10 px-3 bg-background border border-border rounded-md text-xs"
                    >
                      <option value="">Select a course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {requireBranch && (
              <FormField
                control={form.control}
                name="branchId"
                rules={{ required: "Branch is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full h-10 px-3 bg-background border border-border rounded-md text-xs"
                      >
                        <option value="">Select a branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="feeStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Fee Status</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (e.target.value !== "PAID") {
                            form.setValue("applicationFee", undefined);
                            form.setValue("paymentModeMasterId", "");
                            form.setValue("paymentRef", "");
                          }
                        }}
                        className="w-full h-10 px-3 bg-background border border-border rounded-md text-xs"
                      >
                        <option value="PAID">Paid</option>
                        <option value="PENDING">Not paid</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {feeStatus === "PAID" && (
                <FormField
                  control={form.control}
                  name="applicationFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Fee (₹) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          placeholder="e.g. 500"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? undefined : Number(e.target.value)
                            )
                          }
                          className="h-10 text-xs"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {feeStatus === "PAID" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="paymentModeMasterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment mode *</FormLabel>
                      <FormControl>
                        <MasterSelect
                          entityType="paymentmodes"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Select payment mode"
                          className="h-10 text-xs rounded-md"
                          branchId={form.watch("branchId") || undefined}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction / Ref</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Optional ref no."
                          {...field}
                          value={field.value || ""}
                          className="h-10 text-xs"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Counsellor Remarks / Initial Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Walk-in applicant. Eligible for upcoming batch."
                      {...field}
                      className="text-xs min-h-[72px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-3 py-2">
                {serverError}
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <PermissionGate itemKey="admissions.applications" mode="write">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Create Application
                </Button>
              </PermissionGate>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
