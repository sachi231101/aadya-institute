import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateStudent } from "../../../hooks/useStudents";
import { useBranches } from "../../../hooks/useBranches";
import { useCourses } from "../../../hooks/useCourses";
import { useBatches } from "../../../hooks/useBatches";
import { useAuthStore } from "@/store/auth.store";
import { MasterSelect } from "@/components/common/MasterSelect";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { getMasterLabel } from "@/utils/master.utils";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Phone,
  Mail,
  Calendar,
  GraduationCap,
  HeartHandshake,
  MapPin,
  CreditCard,
  MessageSquare,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

const studentSchema = z.object({
  // Core Required
  studentCode: z.string().min(3, "Student Code is required"),
  name: z.string().min(2, "Full Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  branchId: z.string().min(1, "Branch selection is required"),
  
  // Demographics
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.enum(["Male", "Female", "Other", ""]).optional(),
  bloodGroup: z.string().optional().or(z.literal("")),

  // Academic
  qualificationMasterId: z.string().optional().or(z.literal("")),
  previousInstitute: z.string().optional().or(z.literal("")),
  courseId: z.string().optional().or(z.literal("")),
  batchId: z.string().optional().or(z.literal("")),
  sourceMasterId: z.string().optional().or(z.literal("")),

  // Contact (ZenoxERP-aligned)
  alternativePhone: z.string().optional().or(z.literal("")),
  whatsappNumber: z.string().optional().or(z.literal("")),

  // Guardian / Emergency
  guardianName: z.string().optional().or(z.literal("")),
  guardianRelationMasterId: z.string().optional().or(z.literal("")),
  guardianPhone: z.string().optional().or(z.literal("")),
  emergencyContact: z.string().optional().or(z.literal("")),

  // Parent Details (ZenoxERP-aligned)
  fatherName: z.string().optional().or(z.literal("")),
  fatherOccupation: z.string().optional().or(z.literal("")),
  motherName: z.string().optional().or(z.literal("")),
  motherPhone: z.string().optional().or(z.literal("")),

  // Address
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  pincode: z.string().optional().or(z.literal("")),
  areaMasterId: z.string().optional().or(z.literal("")),

  // Financial & Alerts
  totalFee: z.coerce.number().min(0).optional(),
  feePlan: z.enum(["FULL_PAYMENT", "INSTALLMENT"]).optional(),
  downPayment: z.coerce.number().min(0).optional(),
  concession: z.coerce.number().min(0).optional(),
  concessionHeadMasterId: z.string().optional().or(z.literal("")),
  paymentModeMasterId: z.string().optional().or(z.literal("")),
  transactionRef: z.string().optional().or(z.literal("")),
  whatsappEnabled: z.boolean().default(true),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export const AddStudent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createMutation = useCreateStudent();
  const { user } = useAuthStore();
  const isCenterManager = user?.role === "CENTER_MANAGER";
  const [showPassword, setShowPassword] = useState(false);

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : location.pathname.startsWith("/faculty")
    ? "/faculty"
    : "/admin";

  const { data: branchResponse } = useBranches();
  const branches = branchResponse?.data ?? [];

  const { courses } = useCourses();
  const { batches } = useBatches();
  const { options: educationOptions } = useMasterDropdown("education");

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema) as any,
    defaultValues: {
      studentCode: `AAD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: "",
      email: "",
      phone: "",
      password: "Student@123",
      branchId: user?.branchId || "",
      dateOfBirth: "",
      gender: "Male",
      bloodGroup: "",
      qualificationMasterId: "",
      previousInstitute: "",
      courseId: "",
      batchId: "",
      sourceMasterId: "",
      alternativePhone: "",
      whatsappNumber: "",
      guardianName: "",
      guardianRelationMasterId: "",
      guardianPhone: "",
      emergencyContact: "",
      fatherName: "",
      fatherOccupation: "",
      motherName: "",
      motherPhone: "",
      address: "",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "",
      areaMasterId: "",
      totalFee: 35000,
      feePlan: "INSTALLMENT",
      downPayment: 10000,
      concession: 0,
      concessionHeadMasterId: "",
      paymentModeMasterId: "",
      transactionRef: "",
      whatsappEnabled: true,
    },
  });

  React.useEffect(() => {
    if (branches.length > 0 && !form.getValues("branchId")) {
      form.setValue("branchId", user?.branchId || branches[0].id);
    }
  }, [branches, user, form]);

  const selectedCourseId = form.watch("courseId");
  const filteredBatches = React.useMemo(() => {
    if (!selectedCourseId) return batches;
    return batches.filter((b) => b.courseId === selectedCourseId);
  }, [batches, selectedCourseId]);

  const onSubmit = async (data: StudentFormValues) => {
    try {
      // Backend expects standard payload attributes safely
      await createMutation.mutateAsync({
        studentCode: data.studentCode.trim().toUpperCase(),
        name: data.name.trim(),
        email: data.email ? data.email.trim() : undefined,
        phone: data.phone ? data.phone.trim() : undefined,
        password: data.password,
        qualification: data.qualificationMasterId
          ? getMasterLabel(educationOptions, data.qualificationMasterId) || undefined
          : undefined,
        qualificationMasterId: data.qualificationMasterId || undefined,
        areaMasterId: data.areaMasterId || undefined,
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth : undefined,
        branchId: data.branchId,
        gender: data.gender || undefined,
        guardianName: data.guardianName || undefined,
        guardianPhone: data.guardianPhone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        pincode: data.pincode || undefined,
        courseId: data.courseId || undefined,
        batchId: data.batchId || undefined,
        totalFee: data.totalFee,
        feePlan: data.feePlan,
      });

      navigate(`${basePath}/students/all`);
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to create student";
      form.setError("root", { message: msg });
    }
  };

  const generateNewCode = () => {
    form.setValue(
      "studentCode",
      `AAD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`${basePath}/students/all`)}
            className="h-9 w-9 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Register New Student
              </h1>
              <span className="bg-[#1769AA]/10 text-[#1769AA] text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Admission Portal
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Enter complete student personal, academic, guardian, and enrollment details.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`${basePath}/students/all`)}
            className="text-slate-600 font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
            className="bg-[#1769AA] hover:bg-[#125890] text-white font-semibold px-5 shadow-sm"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save & Enroll
              </>
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {form.formState.errors.root && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 text-sm font-medium flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
              {form.formState.errors.root.message}
            </div>
          )}

          {/* ─── SECTION 1: PERSONAL & CONTACT ────────────────────────────── */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <User className="h-4 w-4 text-[#1769AA]" />
                  Personal Information & Credentials
                </CardTitle>
                <span className="text-xs text-slate-500 font-medium">* Required fields</span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Student Code */}
                <FormField
                  control={form.control}
                  name="studentCode"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                          Student ID / Roll No *
                        </FormLabel>
                        <button
                          type="button"
                          onClick={generateNewCode}
                          className="text-[11px] text-[#1769AA] hover:underline flex items-center gap-1 font-medium"
                        >
                          <Sparkles className="h-3 w-3" /> Auto-generate
                        </button>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="e.g. AAD-2026-102"
                          {...field}
                          className="font-mono font-medium text-slate-800 uppercase"
                        />
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
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Full Name *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Rahul Sharma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Institute Branch */}
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Branch / Center *
                      </FormLabel>
                      <FormControl>
                        {isCenterManager ? (
                          <Input
                            value={branches.find((b) => b.id === field.value)?.name || field.value}
                            disabled
                            className="bg-slate-100 text-slate-700 font-medium"
                          />
                        ) : branches.length > 0 ? (
                          <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                            {...field}
                          >
                            <option value="">Select branch...</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                📍 {b.name} ({b.code})
                              </option>
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

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Student Mobile / WhatsApp *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="e.g. 9876543210"
                            {...field}
                            className="pl-9"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            type="email"
                            placeholder="e.g. student@gmail.com"
                            {...field}
                            className="pl-9"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Alternative Phone (ZenoxERP) */}
                <FormField
                  control={form.control}
                  name="alternativePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Alternative Mobile
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Parent / Secondary phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* WhatsApp Number (ZenoxERP) */}
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        WhatsApp Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="If different from mobile" {...field} />
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
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Portal Login Password *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 8 characters"
                            {...field}
                            className="pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date of Birth */}
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Date of Birth
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input type="date" {...field} className="pl-9" />
                        </div>
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
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Gender
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
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

                {/* Blood Group */}
                <FormField
                  control={form.control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Blood Group
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                          {...field}
                        >
                          <option value="">Select (Optional)</option>
                          <option value="O+">O positive (O+)</option>
                          <option value="A+">A positive (A+)</option>
                          <option value="B+">B positive (B+)</option>
                          <option value="AB+">AB positive (AB+)</option>
                          <option value="O-">O negative (O-)</option>
                          <option value="A-">A negative (A-)</option>
                          <option value="B-">B negative (B-)</option>
                          <option value="AB-">AB negative (AB-)</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ─── SECTION 2: ACADEMIC & COURSE ASSIGNMENT ────────────────── */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[#1769AA]" />
                Academic Background & Program Enrollment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Qualification */}
                <FormField
                  control={form.control}
                  name="qualificationMasterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Highest Qualification
                      </FormLabel>
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

                {/* Previous Institute */}
                <FormField
                  control={form.control}
                  name="previousInstitute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Previous School / College
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Bangalore University / PES"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Lead Source */}
                <FormField
                  control={form.control}
                  name="sourceMasterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Lead Source
                      </FormLabel>
                      <FormControl>
                        <MasterSelect
                          entityType="leadsource"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Select Lead Source"
                          className="mt-0 rounded-md h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Course Selection */}
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Enrolled Program / Course
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                          {...field}
                        >
                          <option value="">Select Course...</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              📚 {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Batch Selection */}
                <FormField
                  control={form.control}
                  name="batchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Assigned Batch
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                          {...field}
                        >
                          <option value="">Assign Batch Later / None</option>
                          {filteredBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                              ⚡ {b.name} ({b.code}) — {b.timeSlot || "Regular"}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ─── SECTION 3: GUARDIAN & RESIDENCE ──────────────────────────── */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-[#1769AA]" />
                Parent / Guardian & Residential Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {/* Guardian Name */}
                <FormField
                  control={form.control}
                  name="guardianName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Parent / Guardian Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Suresh Sharma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Relationship */}
                <FormField
                  control={form.control}
                  name="guardianRelationMasterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Relationship
                      </FormLabel>
                      <FormControl>
                        <MasterSelect
                          entityType="parentinfo"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Select relationship"
                          className="mt-0 rounded-md h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Guardian Phone */}
                <FormField
                  control={form.control}
                  name="guardianPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Guardian Phone (SMS/WhatsApp)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 9845012345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Emergency Contact */}
                <FormField
                  control={form.control}
                  name="emergencyContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Emergency Contact No.
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 080-23456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Father / Mother Details (ZenoxERP-aligned) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-3 border-t border-slate-100">
                <FormField
                  control={form.control}
                  name="fatherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Father's Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Rajesh Sharma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fatherOccupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Father's Occupation
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                          {...field}
                        >
                          <option value="">Select...</option>
                          <option value="Business">Business</option>
                          <option value="Salaried">Salaried / Private Job</option>
                          <option value="Govt">Government Employee</option>
                          <option value="Farmer">Farmer / Agriculture</option>
                          <option value="Self-Employed">Self-Employed</option>
                          <option value="Other">Other</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="motherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Mother's Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sunita Sharma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="motherPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Mother's Mobile
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 9845098450" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-2">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                          Residential Street Address
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="e.g. #45, 2nd Main, Indiranagar"
                              {...field}
                              className="pl-9"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        City
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Bengaluru" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="areaMasterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Area / Locality
                      </FormLabel>
                      <FormControl>
                        <MasterSelect
                          entityType="area"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Select area"
                          className="mt-0 rounded-md h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        PIN Code
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="560038" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ─── SECTION 4: FINANCIAL & AUTOMATION ───────────────────────── */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#1769AA]" />
                Fee Plan & Automation Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FormField
                  control={form.control}
                  name="totalFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Agreed Course Fee (₹)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="35000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="feePlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Payment Structure
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                          {...field}
                        >
                          <option value="INSTALLMENT">Installment Plan (2-3 parts)</option>
                          <option value="FULL_PAYMENT">Full One-time Payment</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="downPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Initial Registration Deposit (₹)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ZenoxERP: Concession, Discount, Payment Mode, Transaction Ref */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-3 border-t border-slate-100">
                <FormField
                  control={form.control}
                  name="concession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Concession / Discount (₹)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="concessionHeadMasterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Discount Reason
                      </FormLabel>
                      <FormControl>
                        <MasterSelect
                          entityType="concessionheads"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="None"
                          className="mt-0 rounded-md h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentModeMasterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Payment Mode
                      </FormLabel>
                      <FormControl>
                        <MasterSelect
                          entityType="paymentmodes"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Select Payment Mode"
                          className="mt-0 rounded-md h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transactionRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Transaction / Cheque Ref No
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ref. number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notification Toggles */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Enable Automated WhatsApp Updates & Reminders
                    </p>
                    <p className="text-xs text-slate-500">
                      Send class schedules, absence notifications, and fee receipts to student & parent automatically.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.watch("whatsappEnabled")}
                  onChange={(e) => form.setValue("whatsappEnabled", e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-[#1769AA] focus:ring-[#1769AA]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`${basePath}/students/all`)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-[#1769AA] hover:bg-[#125890] text-white font-semibold px-8 py-2.5 shadow-sm"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registering Student...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Complete Registration & Enroll
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
