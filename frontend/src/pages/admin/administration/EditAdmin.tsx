import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNotificationStore } from "@/store/notification.store";
import { useUser, useUpdateUser } from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const editAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        const digits = val.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
      },
      {
        message: "Phone must be a valid phone number (7-15 digits)",
      }
    ),
  branchId: z.string().optional().or(z.literal("")),
});

type EditAdminFormValues = z.infer<typeof editAdminSchema>;

export const EditAdmin: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { data: userResponse, isLoading, isError } = useUser(id);
  const updateUserMutation = useUpdateUser();
  const { data: branchesResponse } = useBranches();

  const admin = userResponse?.data;
  const branches = branchesResponse?.data ?? [];

  const form = useForm<EditAdminFormValues>({
    resolver: zodResolver(editAdminSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      branchId: "",
    },
  });

  useEffect(() => {
    if (admin) {
      form.reset({
        name: admin.name,
        email: admin.email || "",
        phone: admin.phone || "",
        branchId: admin.branchId || "",
      });
    }
  }, [admin, form]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading administrator...</span>
        </div>
      </div>
    );
  }

  if (isError || !admin) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/administration")} className="mb-4">
          <ArrowLeft size={16} className="mr-2" /> Back to Administrators
        </Button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-2xl font-bold text-text-primary">Administrator Not Found</h2>
          <p className="text-muted-foreground mt-2">The administrator you are trying to edit does not exist.</p>
        </div>
      </div>
    );
  }

  const onSubmit = (data: EditAdminFormValues) => {
    if (id) {
      updateUserMutation.mutate(
        {
          id,
          data: {
            name: data.name,
            email: data.email || undefined,
            phone: data.phone || undefined,
            branchId: data.branchId || null,
          },
        },
        {
          onSuccess: () => {
            addNotification("Administrator updated successfully.", "success");
            navigate("/administration");
          },
          onError: (err: any) => {
            const message = err?.response?.data?.message || "Failed to update administrator.";
            addNotification(message, "error");
          },
        }
      );
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate("/administration")} size="icon">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Edit Administrator</h1>
          <p className="text-muted-foreground mt-1">Update profile information for {admin.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Make changes to the administrator's profile here. Password resets are handled separately.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
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
                        <Input placeholder="admin@aadya.in" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="9876543210" {...field} />
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
                      <FormLabel>Assigned Branch</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                        >
                          <option value="">No branch (Institute-wide)</option>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium">Current Role</label>
                  <div className="mt-2 px-3 py-2 bg-bg-secondary rounded-md text-sm text-muted-foreground">
                    {admin.roles.join(", ") || "No role assigned"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Role changes are handled via the Admin Panel actions menu.</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Account Status</label>
                  <div className="mt-2 px-3 py-2 bg-bg-secondary rounded-md text-sm text-muted-foreground">
                    {admin.status}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Status changes are handled via the Admin Panel actions menu.</p>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => navigate("/administration")}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white transition-colors"
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
