import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Bell, Building2, Loader2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
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

const branchSchema = z.object({
  name: z.string().min(2, "Branch name is required"),
  code: z.string().min(2, "Branch code is required").max(10, "Branch code must be at most 10 characters"),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().regex(/^\d{10}$/, "Phone must be a 10-digit number").optional().or(z.literal("")),
});

type BranchFormValues = z.infer<typeof branchSchema>;

export const AdminLayout: React.FC = () => {
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

  const onSubmit = (data: BranchFormValues) => {
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
          const message = err?.response?.data?.message || "Failed to create branch.";
          addNotification(message, "error");
        },
      }
    );
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-bg-secondary px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2" />
              <div className="flex items-center gap-2 text-muted-foreground hidden sm:flex">
                <Building2 size={18} />
                <span className="text-sm font-medium">Main Campus — Bengaluru</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative text-muted-foreground hover:text-foreground transition-colors">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-secondary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-secondary"></span>
                </span>
              </button>
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
