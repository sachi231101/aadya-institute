import React, { useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStudent, useUpdateStudent } from "../../../hooks/useStudents";
import { useBranches } from "../../../hooks/useBranches";
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
} from "lucide-react";

const studentSchema = z.object({
  name: z.string().min(2, "Full Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
  qualificationMasterId: z.string().optional().or(z.literal("")),
  areaMasterId: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "ON_LEAVE", "COMPLETED", "DISCONTINUED", "CANCELLED"]),
  branchId: z.string().min(1, "Branch is required"),
  gender: z.string().optional().or(z.literal("")),
  bloodGroup: z.string().optional().or(z.literal("")),
  guardianName: z.string().optional().or(z.literal("")),
  guardianPhone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  pincode: z.string().optional().or(z.literal("")),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export const EditStudent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

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
    },
  });

  useEffect(() => {
    if (student) {
      const qualificationMasterId =
        (student as { qualificationMasterId?: string }).qualificationMasterId ||
        findMasterIdByLabel(educationOptions, student.qualification);
      const areaMasterId =
        (student as { areaMasterId?: string }).areaMasterId ||
        findMasterIdByLabel(areaOptions, (student as { area?: string }).area);

      form.reset({
        name: student.user?.name || "",
        email: student.user?.email || "",
        phone: student.user?.phone || "",
        qualificationMasterId,
        areaMasterId,
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split("T")[0] : "",
        status: student.status,
        branchId: student.branchId || student.branch?.id || "",
        gender: student.gender || "Male",
        bloodGroup: student.bloodGroup || "",
        guardianName: student.guardian?.name || "",
        guardianPhone: student.guardian?.phone || "",
        address: student.address?.street || "",
        city: student.address?.city || "Bengaluru",
        pincode: student.address?.pincode || "",
      });
    }
  }, [student, form, educationOptions, areaOptions]);

  const onSubmit = async (data: StudentFormValues) => {
    if (!id) return;
    try {
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
          status: data.status,
          branchId: data.branchId,
          gender: data.gender || undefined,
          guardianName: data.guardianName || undefined,
          guardianPhone: data.guardianPhone || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          pincode: data.pincode || undefined,
        },
      });
      navigate(`${basePath}/students/all`);
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to update student";
      form.setError("root", { message: msg });
    }
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Edit Student Profile
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Updating records for {student.user?.name || student.studentCode} ({student.studentCode})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`${basePath}/students/all`)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
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
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {form.formState.errors.root && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 text-sm font-medium">
              {form.formState.errors.root.message}
            </div>
          )}

          {/* Section 1: Basic Info & Status */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <User className="h-4 w-4 text-[#1769AA]" />
                Identity & Status Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600">Student ID</label>
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
                        Enrollment Status *
                      </FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA]"
                          {...field}
                        >
                          <option value="ACTIVE">🟢 Active Student</option>
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

          {/* Section 2: Guardian & Address */}
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

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`${basePath}/students/all`)}
            >
              Cancel
            </Button>
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
          </div>
        </form>
      </Form>
    </div>
  );
};
