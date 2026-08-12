import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNotificationStore } from "@/store/notification.store";
import { useCreateUser } from "@/hooks/useUsers";
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

const addAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z.string().regex(/^\d{10}$/, "Phone must be a 10-digit number").optional().or(z.literal("")),
  branchId: z.string().optional().or(z.literal("")),
  role: z.string().min(1, "Role is required."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  confirmPassword: z.string().min(1, "Password confirmation is required."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type AddAdminFormValues = z.infer<typeof addAdminSchema>;

export const AddAdmin: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const createUserMutation = useCreateUser();
  const { data: branchesResponse } = useBranches();

  const branches = branchesResponse?.data ?? [];

  const form = useForm<AddAdminFormValues>({
    resolver: zodResolver(addAdminSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      branchId: "",
      role: "ADMIN",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: AddAdminFormValues) => {
    createUserMutation.mutate(
      {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
        roles: [data.role],
        branchId: data.branchId || undefined,
      },
      {
        onSuccess: () => {
          addNotification("Administrator created successfully.", "success");
          navigate("/administration");
        },
        onError: (err: any) => {
          const message = err?.response?.data?.message || "Failed to create administrator.";
          addNotification(message, "error");
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate("/administration")} size="icon">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Add Center Manager</h1>
          <p className="text-muted-foreground mt-1">Create a new center manager account</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Enter the details for the new center manager.</CardDescription>
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
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Role</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...field}
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="CENTER_MANAGER">Center Manager</option>
                          <option value="FACULTY">Faculty</option>
                          <option value="COUNSELLOR">Counsellor</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => navigate("/administration")}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white transition-colors"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                  ) : "Create Center Manager"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
