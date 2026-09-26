import React, { useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFacultyMember, useUpdateFaculty } from "../../../hooks/useFaculty";
import { MasterSelect } from "@/components/common/MasterSelect";
import { usePermissions } from "@/hooks/usePermissions";
import {
  formatLatLngDisplay,
  handleLatLngChange,
  handleLatLngPaste,
} from "@/utils/lat-lng-input";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout";
import { ArrowLeft, Save, Loader2, Pencil, MapPin } from "lucide-react";

const googleMapsUrl = (lat: number | null | undefined, lng: number | null | undefined) =>
  typeof lat === "number" && !Number.isNaN(lat) && typeof lng === "number" && !Number.isNaN(lng)
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : "https://www.google.com/maps";

const WORK_LAT_LNG_FIELDS = {
  latitude: "workLatitude" as const,
  longitude: "workLongitude" as const,
};

const editFacultySchema = z.object({
  name: z.string().min(2, "Full Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
  specialization: z.string().optional().or(z.literal("")),
  designationMasterId: z.string().optional().or(z.literal("")),
  qualificationMasterId: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]),
  workLatitude: z.number().min(-90).max(90).optional().nullable(),
  workLongitude: z.number().min(-180).max(180).optional().nullable(),
});

type EditFacultyFormValues = z.infer<typeof editFacultySchema>;

export const EditFaculty: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { canEditItem, isAdmin, roleScope } = usePermissions();
  const updateMutation = useUpdateFaculty();
  const { data: facultyResponse, isLoading, isError } = useFacultyMember(id);

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : "/admin";
  const facultyListPath = `${basePath}/faculty/all`;
  const canWrite = isAdmin || !roleScope || canEditItem("faculty.all");

  useEffect(() => {
    if (!canWrite) {
      navigate(facultyListPath, { replace: true, state: { accessDenied: true, readOnly: true } });
    }
  }, [canWrite, navigate, facultyListPath]);

  const faculty = facultyResponse?.data;

  const form = useForm<EditFacultyFormValues>({
    resolver: zodResolver(editFacultySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      specialization: "",
      designationMasterId: "",
      qualificationMasterId: "",
      status: "ACTIVE",
      workLatitude: null,
      workLongitude: null,
    },
  });

  const workLatitude = form.watch("workLatitude");
  const workLongitude = form.watch("workLongitude");
  const mapsUrl = googleMapsUrl(workLatitude, workLongitude);

  useEffect(() => {
    if (!faculty) return;
    form.reset({
      name: faculty.user?.name || "",
      email: faculty.user?.email || "",
      phone: faculty.user?.phone || "",
      specialization: faculty.specialization || "",
      designationMasterId: faculty.designationMasterId || "",
      qualificationMasterId: faculty.qualificationMasterId || "",
      status: faculty.status || "ACTIVE",
      workLatitude: faculty.workLatitude ?? null,
      workLongitude: faculty.workLongitude ?? null,
    });
  }, [faculty, form]);

  const onSubmit = async (data: EditFacultyFormValues) => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          specialization: data.specialization || undefined,
          designationMasterId: data.designationMasterId || null,
          qualificationMasterId: data.qualificationMasterId || null,
          status: data.status,
          workLatitude: data.workLatitude ?? null,
          workLongitude: data.workLongitude ?? null,
        },
      });
      navigate(`${basePath}/faculty/${id}`);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to update faculty member.";
      form.setError("root", { message });
    }
  };

  if (!canWrite) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-28">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground font-medium text-xs">Loading faculty...</span>
      </div>
    );
  }

  if (isError || !faculty) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold">Faculty Member Not Found</h2>
        <Button className="mt-4" onClick={() => navigate(`${basePath}/faculty/all`)}>
          Back to Directory
        </Button>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="narrow">
      <div className="flex items-start gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`${basePath}/faculty/${id}`)} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          className="flex-1 min-w-0"
          title="Edit Faculty"
          description={`Update profile for ${faculty.user?.name} (${faculty.employeeCode})`}
        />
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Faculty Details
          </CardTitle>
          <CardDescription>Employee code and branch cannot be changed here.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {form.formState.errors.root && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                  {form.formState.errors.root.message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Employee Code</Label>
                  <Input value={faculty.employeeCode} disabled className="mt-2 bg-slate-50" />
                </div>
                <div>
                  <Label>Branch</Label>
                  <Input value={faculty.branch?.name || "—"} disabled className="mt-2 bg-slate-50" />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
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
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Work Location (for attendance geofencing)</h3>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Open in Google Maps
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="workLatitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="e.g. 12.9716"
                            value={formatLatLngDisplay(field.value)}
                            onPaste={(e) => handleLatLngPaste(e, form.setValue, WORK_LAT_LNG_FIELDS)}
                            onChange={(e) =>
                              handleLatLngChange(e, form.setValue, WORK_LAT_LNG_FIELDS, "latitude")
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workLongitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="e.g. 77.5946"
                            value={formatLatLngDisplay(field.value)}
                            onPaste={(e) => handleLatLngPaste(e, form.setValue, WORK_LAT_LNG_FIELDS)}
                            onChange={(e) =>
                              handleLatLngChange(e, form.setValue, WORK_LAT_LNG_FIELDS, "longitude")
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste both coords at once (lat, lng) from Google Maps. Both fields required for geofencing.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => navigate(`${basePath}/faculty/${id}`)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-primary hover:bg-[#F39A16] text-white"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  );
};
