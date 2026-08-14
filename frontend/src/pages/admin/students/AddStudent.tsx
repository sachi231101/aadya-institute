import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateStudent } from "../../../hooks/useStudents";
import { useBranches } from "../../../hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";

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
import { ArrowLeft, UserPlus, Save, Loader2 } from "lucide-react";


const studentSchema = z.object({
  studentCode: z.string().min(3, "Student Code is required"),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  qualification: z.string().min(2, "Qualification is required").optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  branchId: z.string().min(1, "Branch is required"),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export const AddStudent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createMutation = useCreateStudent();
  const { user } = useAuthStore();
  const isCenterManager = user?.role === "CENTER_MANAGER";

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : location.pathname.startsWith("/faculty")
    ? "/faculty"
    : "/admin";

  const { data: branchResponse } = useBranches();
  const branches = branchResponse?.data ?? [];

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      studentCode: `AAD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: "",
      email: "",
      phone: "",
      password: "Student@123",
      qualification: "",
      dateOfBirth: "",
      branchId: user?.branchId || "",
    },
  });

  React.useEffect(() => {
    if (branches.length > 0 && !form.getValues("branchId")) {
      form.setValue("branchId", user?.branchId || branches[0].id);
    }
  }, [branches, user, form]);

  const onSubmit = async (data: StudentFormValues) => {
    try {
      await createMutation.mutateAsync({
        studentCode: data.studentCode,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        password: data.password,
        qualification: data.qualification || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        branchId: data.branchId,
      });
      navigate(`${basePath}/students/all`);
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to create student";
      form.setError("root", { message: msg });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`${basePath}/students/all`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Add New Student</h2>
          <p className="text-sm text-text-secondary">
            Register a new student into the academy.
          </p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-accent-primary" />
            Student Details
          </CardTitle>
          <CardDescription>
            Enter the student's personal and academic information below.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {form.formState.errors.root && (
                <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 text-sm">
                  {form.formState.errors.root.message}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="studentCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. AAD-2026-001" {...field} />
                      </FormControl>
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
                        <Input placeholder="e.g. John Doe" {...field} />
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
                        <Input type="email" placeholder="e.g. john@example.com" {...field} />
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
                        <Input placeholder="e.g. +91 9876543210" {...field} />
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
                        <Input type="password" placeholder="Min. 8 characters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Highest Qualification</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. B.Tech Computer Science" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                      <FormLabel>Branch *</FormLabel>
                      <FormControl>
                        {isCenterManager ? (
                          <Input 
                            value={branches.find(b => b.id === field.value)?.name || field.value} 
                            disabled 
                            className="bg-slate-100 text-slate-700 font-medium" 
                          />
                        ) : branches.length > 0 ? (
                          <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            {...field}
                          >
                            <option value="">Select branch...</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        ) : (
                          <Input placeholder="Enter branch ID" {...field} />
                        )}
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
                  onClick={() => navigate(`${basePath}/students/all`)}
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
                      <span>Save Student</span>
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
