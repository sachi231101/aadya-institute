import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateFaculty } from "../../../hooks/useFaculty";
import { useBranches } from "../../../hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";
import { MasterSelect } from "@/components/common/MasterSelect";

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
  // ZenoxERP-aligned additional fields
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  designationMasterId: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  dateOfJoining: z.string().optional().or(z.literal("")),
  employmentType: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  qualificationMasterId: z.string().optional().or(z.literal("")),
});

type FacultyFormValues = z.infer<typeof facultySchema>;

export const AddFaculty: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createMutation = useCreateFaculty();
  const { data: branchesResponse, isLoading: branchesLoading } = useBranches({ limit: 100, status: "ACTIVE" });
  const { user } = useAuthStore();
  const isCenterManager = user?.role === "CENTER_MANAGER";

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
      dateOfBirth: "",
      gender: "Male",
      designationMasterId: "",
      department: "",
      dateOfJoining: new Date().toISOString().split("T")[0],
      employmentType: "Full-Time",
      address: "",
      qualificationMasterId: "",
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
      {/* Back Button & Title */}
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
                        {isCenterManager ? (
                          <Input 
                            value={branches.find(b => b.id === field.value)?.name || field.value} 
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

                {/* Specialization */}
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
              </div>

              {/* ZenoxERP-aligned: Extended Faculty Details */}
              <div className="pt-5 border-t border-border/50">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-[#1769AA]" />
                  Job & Academic Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Date of Birth */}
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

                  {/* Gender */}
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#1769AA] focus:ring-offset-2"
                            {...field}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Designation */}
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

                  {/* Department */}
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Computer Science" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date of Joining */}
                  <FormField
                    control={form.control}
                    name="dateOfJoining"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Joining *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Employment Type */}
                  <FormField
                    control={form.control}
                    name="employmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employment Type</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#1769AA] focus:ring-offset-2"
                            {...field}
                          >
                            <option value="Full-Time">Full-Time</option>
                            <option value="Part-Time">Part-Time</option>
                            <option value="Visiting Faculty">Visiting Faculty</option>
                            <option value="Contract">Contract</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Qualification */}
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

                  {/* Address */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Full residential address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
