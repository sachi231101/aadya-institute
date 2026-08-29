import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStudent, useUpdateStudent } from "../../../hooks/useStudents";
import { useBranches } from "../../../hooks/useBranches";
import { useCourses } from "../../../hooks/useCourses";
import { useBatches } from "../../../hooks/useBatches";
import { MasterSelect } from "@/components/common/MasterSelect";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { findMasterIdByLabel, getMasterLabel } from "@/utils/master.utils";

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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  HeartHandshake,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";

const studentSchema = z.object({
  name: z.string().min(2, "Full Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
  qualificationMasterId: z.string().optional().or(z.literal("")),
  areaMasterId: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "ON_LEAVE", "COMPLETED", "DISCONTINUED", "CANCELLED", "DRAFT"]),
  branchId: z.string().min(1, "Branch is required"),
  gender: z.string().optional().or(z.literal("")),
  bloodGroup: z.string().optional().or(z.literal("")),
  guardianName: z.string().optional().or(z.literal("")),
  guardianPhone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  pincode: z.string().optional().or(z.literal("")),

  // Academic & Admission fields
  courseId: z.string().optional().or(z.literal("")),
  batchId: z.string().optional().or(z.literal("")),
  admissionStatus: z.enum(["CONFIRMED", "PROVISIONAL", "CANCELLED", "PENDING", "ACTIVE", "COMPLETED"]).optional(),
  feePlan: z.enum(["FULL_PAYMENT", "INSTALLMENT"]).optional(),
  totalFee: z.number().optional(),
  downPayment: z.number().optional(),
  notes: z.string().optional().or(z.literal("")),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export const EditStudent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isCompleteAdmissionMode = searchParams.get("mode") === "complete-admission";

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : location.pathname.startsWith("/faculty")
    ? "/faculty"
    : "/admin";

  const { data: response, isLoading, isError } = useStudent(id);
  const { data: branchResponse } = useBranches();
  const branches = branchResponse?.data ?? [];
  const { courses } = useCourses();
  const updateMutation = useUpdateStudent();
  const { options: educationOptions } = useMasterDropdown("education");
  const { options: areaOptions } = useMasterDropdown("area");

  const student = response?.data;

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      qualificationMasterId: "",
      areaMasterId: "",
      dateOfBirth: "",
      status: "ACTIVE",
      branchId: "",
      gender: "Male",
      bloodGroup: "",
      guardianName: "",
      guardianPhone: "",
      address: "",
      city: "Bengaluru",
      pincode: "",
      courseId: "",
      batchId: "",
      admissionStatus: "CONFIRMED",
      feePlan: "INSTALLMENT",
      totalFee: 0,
      downPayment: 0,
      notes: "",
    },
  });

  const selectedCourseId = form.watch("courseId");
  const selectedBranchId = form.watch("branchId");
  const { batches } = useBatches({
    courseId: selectedCourseId || undefined,
  });

  const filteredBatches = useMemo(() => {
    if (!batches || batches.length === 0) return [];
    return batches.filter((b) => {
      if (selectedCourseId && b.courseId && b.courseId !== selectedCourseId) return false;
      if (selectedBranchId && b.branchId && b.branchId !== selectedBranchId) return false;
      return true;
    });
  }, [batches, selectedCourseId, selectedBranchId]);

  const isDraftStudent = useMemo(() => {
    if (!student) return false;
    return (
      student.status === ("DRAFT" as any) ||
      (student as any).isDraft ||
      (student as any).admissionStatus === "PENDING" ||
      (student.admissions && student.admissions[0]?.status === "PENDING") ||
      isCompleteAdmissionMode
    );
  }, [student, isCompleteAdmissionMode]);

  useEffect(() => {
    if (student) {
      const qualificationMasterId =
        (student as { qualificationMasterId?: string }).qualificationMasterId ||
        findMasterIdByLabel(educationOptions, student.qualification);
      const areaMasterId =
        (student as { areaMasterId?: string }).areaMasterId ||
        findMasterIdByLabel(areaOptions, (student as { area?: string }).area);

      const admission = student.admissions?.[0] as any;
      const enrollment = student.batchEnrollments?.[0] as any;
      const initialCourseId = admission?.courseId || admission?.course?.id || enrollment?.batch?.course?.id || "";
      const initialBatchId = admission?.batchId || enrollment?.batchId || "";
      const initialTotalFee = Number(student.fees?.totalFee || (student.fees as any)?.total || admission?.totalFee || 0);
      const initialDownPay = Number(student.fees?.amountPaid || (student.fees as any)?.paid || 0);

      const initialStatus = isCompleteAdmissionMode
        ? "ACTIVE"
        : (student.status as any) === "DRAFT" || (student as any).isDraft
        ? "DRAFT"
        : student.status;

      const initialAdmStatus = isCompleteAdmissionMode
        ? "CONFIRMED"
        : (admission?.status as any) || (student.status === "ACTIVE" ? "CONFIRMED" : "PENDING");

      form.reset({
        name: student.user?.name || "",
        email: student.user?.email || "",
        phone: student.user?.phone || "",
        qualificationMasterId,
        areaMasterId,
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split("T")[0] : "",
        status: initialStatus,
        branchId: student.branchId || student.branch?.id || "",
        gender: student.gender || "Male",
        bloodGroup: student.bloodGroup || "",
        guardianName: student.guardian?.name || "",
        guardianPhone: student.guardian?.phone || "",
        address: student.address?.street || "",
        city: student.address?.city || "Bengaluru",
        pincode: student.address?.pincode || "",
        courseId: initialCourseId,
        batchId: initialBatchId,
        admissionStatus: initialAdmStatus,
        feePlan: (admission?.feePlan as any) || "INSTALLMENT",
        totalFee: initialTotalFee,
        downPayment: initialDownPay,
        notes: admission?.notes || "",
      });
    }
  }, [student, form, educationOptions, areaOptions, isCompleteAdmissionMode]);

  // When course changes and total fee is 0, auto-fill fee from course catalog
  const handleCourseChange = (newCourseId: string) => {
    form.setValue("courseId", newCourseId);
    form.setValue("batchId", "");
    const matchedCourse = courses.find((c) => c.id === newCourseId);
    if (matchedCourse && (matchedCourse.fee || (matchedCourse as any).totalFee)) {
      const suggestedFee = Number(matchedCourse.fee || (matchedCourse as any).totalFee || 0);
      const currentFee = form.getValues("totalFee");
      if (!currentFee || currentFee === 0) {
        form.setValue("totalFee", suggestedFee);
      }
    }
  };

  const executeSave = async (data: StudentFormValues, forceActive = false) => {
    if (!id) return;
    try {
      const finalStatus = forceActive ? "ACTIVE" : data.status;
      const finalAdmStatus = forceActive ? "CONFIRMED" : data.admissionStatus;

      await updateMutation.mutateAsync({
        id,
        data: {
          name: data.name.trim(),
          email: data.email ? data.email.trim() : undefined,
          phone: data.phone ? data.phone.trim() : undefined,
          qualification: data.qualificationMasterId
            ? getMasterLabel(educationOptions, data.qualificationMasterId) || undefined
            : undefined,
          qualificationMasterId: data.qualificationMasterId || undefined,
          areaMasterId: data.areaMasterId || undefined,
          dateOfBirth: data.dateOfBirth || undefined,
          status: finalStatus,
          branchId: data.branchId,
          gender: data.gender || undefined,
          bloodGroup: data.bloodGroup || undefined,
          guardianName: data.guardianName || undefined,
          guardianPhone: data.guardianPhone || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          pincode: data.pincode || undefined,
          courseId: data.courseId || undefined,
          batchId: data.batchId || undefined,
          admissionStatus: finalAdmStatus,
          feePlan: data.feePlan || undefined,
          totalFee: data.totalFee !== undefined ? Number(data.totalFee) : undefined,
          downPayment: data.downPayment !== undefined ? Number(data.downPayment) : undefined,
          notes: data.notes || undefined,
        },
      });
      navigate(`${basePath}/students/all`);
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to update student profile";
      form.setError("root", { message: msg });
    }
  };

  const onSubmit = async (data: StudentFormValues) => {
    await executeSave(data, false);
  };

  const handleCompleteAdmission = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    const values = form.getValues();
    if (!values.courseId) {
      form.setError("courseId", { message: "Please select an enrolled Course to complete admission" });
      return;
    }
    await executeSave(values, true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1769AA]" />
        <span className="ml-3 text-slate-600 font-medium">Loading student profile...</span>
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4 opacity-70" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Student not found</h3>
        <p className="text-slate-500 mb-6">The requested student could not be located in database.</p>
        <Button variant="outline" onClick={() => navigate(`${basePath}/students/all`)}>
          Back to Student Tracker
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* ─── Header ─── */}
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
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isDraftStudent ? "Complete Student Admission" : "Edit Student Profile"}
              </h1>
              {isDraftStudent ? (
                <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold">
                  Draft Student
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                  {student.status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Updating records for <span className="font-semibold text-slate-700">{student.user?.name || student.studentCode}</span> ({student.studentCode})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`${basePath}/students/all`)}
            className="text-xs h-9 font-semibold"
          >
            Cancel
          </Button>

          {isDraftStudent ? (
            <Button
              type="button"
              onClick={handleCompleteAdmission}
              disabled={updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-sm flex items-center gap-1.5"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Complete Admission & Activate
            </Button>
          ) : (
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={updateMutation.isPending}
              className="bg-[#1769AA] hover:bg-[#125890] text-white font-semibold text-xs h-9 px-5 shadow-sm flex items-center gap-1.5"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {form.formState.errors.root && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 text-sm font-medium">
              {form.formState.errors.root.message}
            </div>
          )}

          {/* ─── Section 1: Academic & Admission Management (Highlighted) ─── */}
          <Card className="border-[#1769AA]/30 shadow-sm overflow-hidden ring-1 ring-[#1769AA]/10">
            <CardHeader className="bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border-b border-blue-100 py-3.5 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-[#1769AA]" />
                  Academic Program & Batch Enrollment
                </CardTitle>
                <Badge variant="outline" className="bg-white text-xs font-semibold text-[#1769AA] border-[#1769AA]/30">
                  Required for Admission
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Course Selection */}
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1">
                        Enrolled Course / Program *
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                          value={field.value || ""}
                          onChange={(e) => handleCourseChange(e.target.value)}
                        >
                          <option value="">-- Select Course --</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.code ? `(${c.code})` : ""} {c.fee ? `- ₹${Number(c.fee).toLocaleString()}` : ""}
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
                      <FormLabel className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1">
                        Assigned Batch
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                          value={field.value || ""}
                          onChange={field.onChange}
                        >
                          <option value="">-- Assign Batch Later / Not Assigned --</option>
                          {filteredBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} {b.timeSlot ? `[${b.timeSlot}]` : ""} {b.faculty?.user?.name ? `• ${b.faculty.user.name}` : ""}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {filteredBatches.length} batch(es) available for selected criteria
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Admission Status */}
                <FormField
                  control={form.control}
                  name="admissionStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase text-slate-700">
                        Admission Status
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                          value={field.value || "CONFIRMED"}
                          onChange={field.onChange}
                        >
                          <option value="CONFIRMED">🟢 CONFIRMED (Official Admission)</option>
                          <option value="ACTIVE">🟢 ACTIVE (Enrolled & Ongoing)</option>
                          <option value="PENDING">🟡 PENDING / DRAFT</option>
                          <option value="PROVISIONAL">🔵 PROVISIONAL</option>
                          <option value="CANCELLED">🔴 CANCELLED</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fee & Payment Details */}
              <div className="border-t border-slate-100 pt-4 mt-4 grid grid-cols-1 md:grid-cols-3 gap-5">
                <FormField
                  control={form.control}
                  name="feePlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Fee Payment Plan
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                          value={field.value || "INSTALLMENT"}
                          onChange={field.onChange}
                        >
                          <option value="INSTALLMENT">Monthly / Multi Installments</option>
                          <option value="FULL_PAYMENT">Full One-Time Payment</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Total Course Fee (₹)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                          <Input
                            type="number"
                            placeholder="e.g. 25000"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                            className="pl-7 font-bold text-slate-800"
                          />
                        </div>
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
                        Down Payment / Paid Fee (₹)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                          <Input
                            type="number"
                            placeholder="e.g. 5000"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                            className="pl-7 font-semibold text-emerald-700"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <div className="pt-1">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Admission Remarks / Notes
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Concession applied, verified certificates, batch transfer, etc."
                          {...field}
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ─── Section 2: Student Identity & Center ─── */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <User className="h-4 w-4 text-[#1769AA]" />
                Student Identity & Center Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">Student ID / Code</label>
                  <Input value={student.studentCode} disabled className="mt-1 bg-slate-100 font-mono font-bold text-slate-700" />
                </div>

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

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Student Status *
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                          {...field}
                        >
                          <option value="ACTIVE">🟢 Active Student</option>
                          <option value="DRAFT">🟡 Draft / Admission in Progress</option>
                          <option value="ON_LEAVE">🟡 On Approved Leave</option>
                          <option value="COMPLETED">🎓 Graduated / Completed</option>
                          <option value="DISCONTINUED">🔴 Discontinued</option>
                          <option value="CANCELLED">⚪ Admission Cancelled</option>
                        </select>
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
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Branch / Center *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                          <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                            {...field}
                          >
                            <option value="">Select branch...</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
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
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input placeholder="9876543210" {...field} className="pl-9" />
                        </div>
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
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input type="email" placeholder="student@gmail.com" {...field} className="pl-9" />
                        </div>
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
              </div>
            </CardContent>
          </Card>

          {/* ─── Section 3: Guardian & Address ─── */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-[#1769AA]" />
                Parent/Guardian & Residence Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

                <FormField
                  control={form.control}
                  name="guardianPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Guardian Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 9845012345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase text-slate-600">
                        Residential Address
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
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
              </div>
            </CardContent>
          </Card>

          {/* ─── Bottom Actions ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`${basePath}/students/all`)}
            >
              Cancel
            </Button>

            {isDraftStudent && (
              <Button
                type="button"
                variant="outline"
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateMutation.isPending}
                className="border-amber-400 text-amber-900 hover:bg-amber-50"
              >
                <Save className="h-4 w-4 mr-2 text-amber-600" />
                Save as Draft
              </Button>
            )}

            {isDraftStudent ? (
              <Button
                type="button"
                onClick={handleCompleteAdmission}
                disabled={updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-sm flex items-center gap-2"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Complete Admission & Activate
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-[#1769AA] hover:bg-[#125890] text-white font-semibold px-6 shadow-sm"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Profile
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};
