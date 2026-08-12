import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateFaculty } from "../../../hooks/useFaculty";
import { useBranches } from "../../../hooks/useBranches";

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

const facultySchema = z.object({
  employeeCode: z.string().min(1, "Employee Code is required").max(20),
  name: z.string().min(2, "Full Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  specialization: z.string().optional().or(z.literal("")),
  branchId: z.string().min(1, "Branch is required"),
});

type FacultyFormValues = z.infer<typeof facultySchema>;

export const AddFaculty: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateFaculty();
  const { data: branchesResponse, isLoading: branchesLoading } = useBranches({ limit: 100, status: "ACTIVE" });

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
      branchId: "",
    },
  });

  const onSubmit = async (data: FacultyFormValues) => {
    try {
      await createMutation.mutateAsync({
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        password: data.password,
        employeeCode: data.employeeCode,
        specialization: data.specialization || undefined,
        branchId: data.branchId,
      });
      navigate("/admin/faculty/all");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to create faculty member.";
      form.setError("root", { message });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button & Title */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate("/admin/faculty/all")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Add New Faculty</h2>
          <p className="text-sm text-text-secondary">
            Register a new professor or technical instructor to the academy.
          </p>
        </div>
      </div>

      {/* Main Card Form */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#1769AA]" />
            Faculty Information
          </CardTitle>
          <CardDescription>
            Enter personal details, credentials, specialization, and branch assignment.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Root-level error */}
              {form.formState.errors.root && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                  {form.formState.errors.root.message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Employee Code */}
                <FormField
                  control={form.control}
                  name="employeeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. FAC-2026-01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Full Name */}
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

                {/* Email Address */}
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

                {/* Phone Number */}
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

                {/* Password */}
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

                {/* Branch */}
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch *</FormLabel>
                      <FormControl>
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Specialization */}
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Subject / Specialization</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Full Stack MERN Architecture" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Bottom Action Footer */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border/50">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/admin/faculty/all")}
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
