import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Target, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateLead } from "@/hooks/useLeads";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { useBranches } from "@/hooks/useBranches";
import { useCourses } from "@/hooks/useCourses";
import { MasterSelect } from "@/components/common/MasterSelect";

const addLeadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[0-9+\s-]{10,15}$/, "Please enter a valid phone number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  interestedIn: z.string().min(1, "Interest or course name is required").trim(),
  courseId: z.string().optional().or(z.literal("")),
  sourceMasterId: z.string().optional().or(z.literal("")),
  priority: z.string().default("MEDIUM"),
  branchId: z.string().min(1, "Branch is required"),
  notes: z.string().optional().or(z.literal("")),
});

type AddLeadFormValues = z.infer<typeof addLeadSchema>;

export const AddLead: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { selectedBranchId } = useBranchStore();
  const createLeadMutation = useCreateLead();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const { courses } = useCourses();
  const branches = branchesResponse?.data || [];

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : "/admin";

  const defaultBranch =
    user?.branchId ||
    (selectedBranchId !== "ALL" ? selectedBranchId : "") ||
    (branches.length > 0 ? branches[0].id : "");

  const form = useForm<AddLeadFormValues>({
    resolver: zodResolver(addLeadSchema) as any,
    defaultValues: {
      name: "",
      phoneNumber: "",
      email: "",
      interestedIn: "",
      courseId: "",
      sourceMasterId: "",
      priority: "MEDIUM",
      branchId: defaultBranch,
      notes: "",
    },
  });

  // Keep branch pre-selected when branches load asynchronously
  useEffect(() => {
    if (!form.getValues("branchId") && defaultBranch) {
      form.setValue("branchId", defaultBranch);
    }
  }, [defaultBranch, form]);

  const onSubmit = (data: AddLeadFormValues) => {
    createLeadMutation.mutate(
      {
        name: data.name,
        phoneNumber: data.phoneNumber,
        email: data.email || undefined,
        interestedIn: data.interestedIn,
        courseId: data.courseId || undefined,
        sourceMasterId: data.sourceMasterId || undefined,
        priority: data.priority,
        branchId: data.branchId,
        notes: data.notes || undefined,
      },
      {
        onSuccess: (res: any) => {
          const newLeadId = res?.data?.id;
          if (newLeadId) {
            navigate(`${basePath}/leads/${newLeadId}`);
          } else {
            navigate(`${basePath}/leads`);
          }
        },
        onError: (err: any) => {
          const msg = err.response?.data?.message || "Failed to create lead";
          const errors = err.response?.data?.errors;
          if (Array.isArray(errors) && errors.length > 0) {
            const details = errors.map((e: any) => `${e.field ? e.field + ": " : ""}${e.message}`).join(", ");
            form.setError("root", { message: `${msg} (${details})` });
          } else {
            form.setError("root", { message: msg });
          }
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Button variant="ghost" onClick={() => navigate(`${basePath}/leads`)} className="gap-2 -ml-2">
        <ArrowLeft size={16} /> Back to Leads
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#1769AA]/10 flex items-center justify-center">
          <Target className="h-5 w-5 text-[#1769AA]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Add New Lead</h1>
          <p className="text-sm text-text-secondary">Capture a new lead for AI voice qualification</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {form.formState.errors.root && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{form.formState.errors.root.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl><Input placeholder="e.g. Rahul Sharma" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl><Input placeholder="e.g. 9876543210" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input placeholder="e.g. rahul@email.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="interestedIn" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interested In *</FormLabel>
                    <FormControl><Input placeholder="e.g. Full Stack Web Development" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="courseId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matched Course</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const selectedCourse = courses.find((c: any) => c.id === e.target.value);
                          if (selectedCourse && !form.getValues("interestedIn")) {
                            form.setValue("interestedIn", selectedCourse.name);
                          }
                        }}
                        className="w-full h-9 px-3 rounded-md border border-border text-sm bg-background"
                      >
                        <option value="">Select course (optional)</option>
                        {courses.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="branchId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch *</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full h-9 px-3 rounded-md border border-border text-sm bg-background">
                        <option value="">Select branch</option>
                        {branches.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="sourceMasterId" render={({ field }) => (
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
                )} />

                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full h-9 px-3 rounded-md border border-border text-sm bg-background">
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
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
              )} />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate(`${basePath}/leads`)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white font-semibold"
                  disabled={createLeadMutation.isPending}
                >
                  {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
