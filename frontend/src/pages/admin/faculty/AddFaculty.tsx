import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFacultyStore } from "../../../store/faculty.store";

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
  facultyCode: z.string().min(3, "Faculty Code is required"),
  name: z.string().min(2, "Full Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  designation: z.string().min(2, "Designation is required"),
  specialization: z.string().min(2, "Specialization is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
  status: z.enum(["ACTIVE", "ON_LEAVE", "INACTIVE"]),
});

type FacultyFormValues = z.infer<typeof facultySchema>;

export const AddFaculty: React.FC = () => {
  const navigate = useNavigate();
  const { addFaculty } = useFacultyStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultCode = `FAC-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`;

  const form = useForm<FacultyFormValues>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
      facultyCode: defaultCode,
      name: "",
      email: "",
      phone: "",
      designation: "Assistant Professor",
      specialization: "",
      joiningDate: new Date().toISOString().split("T")[0],
      status: "ACTIVE",
    },
  });

  const onSubmit = async (data: FacultyFormValues) => {
    setIsSubmitting(true);
    try {
      // Simulate frontend submission processing
      await new Promise((resolve) => setTimeout(resolve, 600));

      addFaculty({
        ...data,
        instituteId: "aadya-inst-1",
        branchId: "branch-1",
      });

      navigate("/admin/faculty/all");
    } catch (error) {
      console.error("Error adding faculty:", error);
    } finally {
      setIsSubmitting(false);
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
            Enter personal details, credentials, specialization, and designation.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Faculty Code */}
                <FormField
                  control={form.control}
                  name="facultyCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Faculty Code *</FormLabel>
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
                      <FormLabel>Email Address *</FormLabel>
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
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. +91 9876543201" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Designation */}
                <FormField
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Senior Professor / Lead Instructor" {...field} />
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
                      <FormLabel>Subject / Specialization *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Full Stack MERN Architecture" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Joining Date */}
                <FormField
                  control={form.control}
                  name="joiningDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joining Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <FormControl>
                        <select 
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#1769AA] focus:ring-offset-2"
                          {...field}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="ON_LEAVE">On Leave</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
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
                  disabled={isSubmitting}
                  className="px-5 font-medium transition-colors"
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white font-medium px-6 py-2 shadow-sm transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
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
