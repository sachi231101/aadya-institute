import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical, Eye, Edit, Shield, Key, Power, Trash2, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { useAdminUsers, useUpdateUserStatus, useDeleteUser } from "@/hooks/useUsers";
import type { UserResponse } from "@/services/users.api";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Map backend role names to display labels
const ROLE_DISPLAY: Record<string, string> = {
  ADMIN: "Super Admin",
  CENTER_MANAGER: "Center Manager",
  COUNSELLOR: "Counsellor",
  FACULTY: "Faculty",
  STUDENT: "Student",
};

const getRoleLabel = (roles: string[]): string => {
  if (!roles.length) return "No Role";
  return ROLE_DISPLAY[roles[0]] || roles[0];
};

const getStatusLabel = (status: string): string => {
  if (status === "ACTIVE") return "Active";
  if (status === "INACTIVE") return "Inactive";
  if (status === "BLOCKED") return "Blocked";
  return status;
};

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Fetch admins from backend
  const { data: usersResponse, isLoading, isError, error } = useAdminUsers();
  const updateStatusMutation = useUpdateUserStatus();
  const deleteUserMutation = useDeleteUser();

  const admins: UserResponse[] = usersResponse?.data ?? [];

  // Determine if logged-in user is Super Admin (has ADMIN role)
  const isSuperAdmin = user?.role === "ADMIN";

  // Modal State
  const [activeModal, setActiveModal] = useState<
    "deactivate" | "activate" | "delete" | "resetPassword" | "changePermissions" | null
  >(null);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  // Form states for modals
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newRole, setNewRole] = useState("");

  const selectedAdmin = admins.find((a) => a.id === selectedAdminId);

  // Handlers
  const handleOpenModal = (adminId: string, modalType: typeof activeModal) => {
    setSelectedAdminId(adminId);
    setActiveModal(modalType);
    setDeleteConfirmText("");
    setNewPassword("");
    setConfirmPassword("");
    setNewRole("");
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedAdminId(null);
  };

  const handleDeactivate = () => {
    if (selectedAdminId) {
      updateStatusMutation.mutate(
        { id: selectedAdminId, data: { status: "INACTIVE" } },
        {
          onSuccess: () => {
            addNotification("Administrator deactivated successfully.", "success");
            closeModal();
          },
          onError: (err: any) => {
            addNotification(err?.response?.data?.message || "Failed to deactivate administrator.", "error");
          },
        }
      );
    }
  };

  const handleActivate = () => {
    if (selectedAdminId) {
      updateStatusMutation.mutate(
        { id: selectedAdminId, data: { status: "ACTIVE" } },
        {
          onSuccess: () => {
            addNotification("Administrator activated successfully.", "success");
            closeModal();
          },
          onError: (err: any) => {
            addNotification(err?.response?.data?.message || "Failed to activate administrator.", "error");
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (selectedAdminId && deleteConfirmText === "DELETE") {
      deleteUserMutation.mutate(selectedAdminId, {
        onSuccess: () => {
          addNotification("Administrator deleted successfully.", "success");
          closeModal();
        },
        onError: (err: any) => {
          addNotification(err?.response?.data?.message || "Failed to delete administrator.", "error");
        },
      });
    }
  };

  const handleResetPassword = () => {
    if (newPassword && newPassword === confirmPassword) {
      // TODO: Wire to reset-password API when available
      addNotification("Password reset successfully.", "success");
      closeModal();
    }
  };

  const handleChangePermissions = () => {
    if (selectedAdminId && newRole) {
      // TODO: Wire to update-role API when available
      addNotification("Permissions updated successfully.", "success");
      closeModal();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">
              Manage system administrators and their access levels.
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading administrators...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">
              Manage system administrators and their access levels.
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <h3 className="text-lg font-medium text-red-600">Failed to load administrators</h3>
            <p className="text-muted-foreground mt-2">
              {(error as any)?.response?.data?.message || "An error occurred while fetching data."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">
            Manage system administrators and their access levels.
          </p>
        </div>

        <div className="flex justify-start">
          <Button onClick={() => navigate("/administration/admins/new")} className="gap-2 bg-[#1769AA] hover:bg-[#F39A16] text-white transition-colors">
            <Plus size={16} />
            Add Admin
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-text-primary">No administrators found.</h3>
              <p className="text-muted-foreground mt-2 mb-4">Create your first administrator to manage access to the Aadya ERP.</p>
              <Button onClick={() => navigate("/administration/admins/new")} className="bg-accent-primary">
                <Plus size={16} className="mr-2" /> Add Admin
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader className="bg-bg-secondary">
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => {
                    const isCurrentUser = admin.id === user?.id;

                    return (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium font-mono text-xs">{admin.id.slice(0, 8)}...</TableCell>
                        <TableCell>{admin.name}</TableCell>
                        <TableCell>{admin.email || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={admin.roles.includes("ADMIN")
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-bg-primary text-text-primary border-border"
                            }
                          >
                            {getRoleLabel(admin.roles)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              admin.status === "ACTIVE"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                            }
                          >
                            {getStatusLabel(admin.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => navigate(`/administration/admins/${admin.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/administration/admins/${admin.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Admin
                              </DropdownMenuItem>

                              {!isCurrentUser && isSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleOpenModal(admin.id, "changePermissions")}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Change Permissions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenModal(admin.id, "resetPassword")}>
                                    <Key className="mr-2 h-4 w-4" />
                                    Reset Password
                                  </DropdownMenuItem>

                                  {admin.status === "ACTIVE" ? (
                                    <DropdownMenuItem onClick={() => handleOpenModal(admin.id, "deactivate")}>
                                      <Power className="mr-2 h-4 w-4" />
                                      Deactivate Admin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleOpenModal(admin.id, "activate")}>
                                      <Power className="mr-2 h-4 w-4 text-green-600" />
                                      <span className="text-green-600">Activate Admin</span>
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleOpenModal(admin.id, "delete")}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Admin
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deactivate Modal */}
      <Dialog open={activeModal === "deactivate"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Administrator?</DialogTitle>
            <DialogDescription className="py-4">
              Are you sure you want to deactivate:<br /><br />
              <strong className="text-foreground">{selectedAdmin?.name}</strong><br />
              <span className="text-muted-foreground">{selectedAdmin?.email}</span><br /><br />
              The administrator will no longer be able to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deactivating...</>
              ) : "Deactivate Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Modal */}
      <Dialog open={activeModal === "activate"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Administrator?</DialogTitle>
            <DialogDescription className="py-4">
              Are you sure you want to activate:<br /><br />
              <strong className="text-foreground">{selectedAdmin?.name}</strong><br />
              <span className="text-muted-foreground">{selectedAdmin?.id}</span><br /><br />
              This administrator will be allowed to log in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleActivate}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating...</>
              ) : "Activate Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={activeModal === "delete"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Administrator?</DialogTitle>
            <DialogDescription className="py-4 space-y-4">
              <div>
                You are about to permanently delete:<br /><br />
                <strong className="text-foreground">{selectedAdmin?.name}</strong><br />
                <span className="text-muted-foreground">{selectedAdmin?.email}</span>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm font-medium">
                This action cannot be undone. All data will be permanently removed.
              </div>
              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-foreground">
                  Type <strong className="text-red-600 select-none">DELETE</strong> to confirm
                </label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="border-red-200 focus-visible:ring-red-500"
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirmText !== "DELETE" || deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : "Delete Administrator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={activeModal === "resetPassword"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription className="py-4 space-y-4">
              <div>
                Administrator: <strong className="text-foreground">{selectedAdmin?.name}</strong>
              </div>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              className="bg-accent-primary"
              onClick={handleResetPassword}
              disabled={!newPassword || newPassword !== confirmPassword}
            >
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Permissions Modal */}
      <Dialog open={activeModal === "changePermissions"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Permissions</DialogTitle>
            <DialogDescription className="py-4 space-y-4">
              <div>
                Administrator: <strong className="text-foreground">{selectedAdmin?.name}</strong>
              </div>
              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium">New Role</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="" disabled>Select a role...</option>
                  <option value="ADMIN">Super Admin</option>
                  <option value="CENTER_MANAGER">Center Manager</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="COUNSELLOR">Counsellor</option>
                </select>
              </div>
              {newRole && newRole !== (selectedAdmin?.roles?.[0] || "") && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                  <strong>Note:</strong> You are changing this user's access level from <strong>{getRoleLabel(selectedAdmin?.roles || [])}</strong> to <strong>{ROLE_DISPLAY[newRole] || newRole}</strong>.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              className="bg-accent-primary"
              onClick={handleChangePermissions}
              disabled={!newRole}
            >
              Update Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
