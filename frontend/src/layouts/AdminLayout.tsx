import React, { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Building2, Loader2, Plus } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { NotificationPopover } from "../components/notifications/NotificationPopover";
import { InstallAppButton } from "@/components/common/InstallAppButton";
import { InstallLoginPopup } from "@/components/common/InstallLoginPopup";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useNotificationStore } from "@/store/notification.store";
import { useCreateBranch } from "@/hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";

const branchSchema = z.object({
  name: z.string().min(2, "Branch name is required"),
  code: z.string().min(2, "Branch code is required").max(10, "Branch code must be at most 10 characters"),
  address: z.string().optional().or(z.literal("")),
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
});

type BranchFormValues = z.infer<typeof branchSchema>;

export const AdminLayout: React.FC = () => {
  const { token, user } = useAuthStore();
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const createBranchMutation = useCreateBranch();

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      phone: "",
    },
  });

  const userRoles = user?.roles || (user?.role ? [user.role] : []);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!userRoles.includes("ADMIN")) {
    if (userRoles.includes("COUNSELLOR")) {
      return <Navigate to="/counselor/dashboard" replace />;
    }
    if (userRoles.includes("CENTER_MANAGER")) {
      return <Navigate to="/center/dashboard" replace />;
    }
    if (userRoles.includes("FACULTY")) {
      return <Navigate to="/faculty/dashboard" replace />;
    }
    if (userRoles.includes("STUDENT")) {
      return <Navigate to="/student/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  const onSubmit = (data: BranchFormValues) => {
    form.clearErrors("root");
    createBranchMutation.mutate(
      {
        name: data.name,
        code: data.code,
        address: data.address || undefined,
        phone: data.phone || undefined,
      },
      {
        onSuccess: () => {
          addNotification(`Branch "${data.name}" created successfully!`, "success");
          setIsBranchModalOpen(false);
          form.reset();
        },
        onError: (err: any) => {
          const serverErrors = err?.response?.data?.errors;
          const message =
            Array.isArray(serverErrors) && serverErrors.length > 0
              ? `${serverErrors[0].field ? serverErrors[0].field + ": " : ""}${serverErrors[0].message}`
              : err?.response?.data?.message || err?.message || "Failed to create branch.";
          form.setError("root", { message });
          addNotification(message, "error");
        },
      }
    );
  };

  return (
    <SidebarProvider>
      <InstallLoginPopup />
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-bg-secondary px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2" />
            </div>

            <div className="flex items-center gap-3">
              <InstallAppButton variant="header" />
              <Button 
                onClick={() => {
                  form.reset();
                  setIsBranchModalOpen(true);
                }}
                className="gap-2 bg-[#1769AA] hover:bg-[#F39A16] text-white transition-colors h-9 px-4 hidden sm:flex font-semibold shadow-sm"
              >
                <Plus size={16} />
                Create a Branch
              </Button>
              <NotificationPopover />
            </div>

          </header>
          
          <main className="flex-1 overflow-auto bg-bg-primary">
            <Outlet />
          </main>
        </div>
      </div>

      <Dialog open={isBranchModalOpen} onOpenChange={setIsBranchModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Branch</DialogTitle>
            <DialogDescription>
              Add a new Aadya Institute branch to the system.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {form.formState.errors.root && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                  {form.formState.errors.root.message}
                </div>
              )}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ramamurthy Nagar" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. RMN" {...field} />
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
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 9876543210" {...field} />
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
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ramamurthy Nagar, Bengaluru" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsBranchModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
                  disabled={createBranchMutation.isPending}
                >
                  {createBranchMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                  ) : "Create Branch"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};
