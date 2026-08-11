import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical, Eye, Edit, Shield, Key, Power, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useAdminStore } from "@/store/admin.store";
import { useNotificationStore } from "@/store/notification.store";

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

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { admins, updateAdmin, deleteAdmin } = useAdminStore();
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Determine if logged-in user is Super Admin
  const isSuperAdmin = user?.id === "aadya-super-admin" || user?.name === "Aadya Super Admin";

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
      updateAdmin(selectedAdminId, { status: "Inactive" });
      addNotification("Administrator deactivated successfully.", "success");
      closeModal();
    }
  };

  const handleActivate = () => {
    if (selectedAdminId) {
      updateAdmin(selectedAdminId, { status: "Active" });
      addNotification("Administrator activated successfully.", "success");
      closeModal();
    }
  };

  const handleDelete = () => {
    if (selectedAdminId && deleteConfirmText === "DELETE") {
      deleteAdmin(selectedAdminId);
      addNotification("Administrator deleted successfully.", "success");
      closeModal();
    }
  };

  const handleResetPassword = () => {
    if (newPassword && newPassword === confirmPassword) {
      // In a real app, this would call an API
      addNotification("Password reset successfully.", "success");
      closeModal();
    }
  };

  const handleChangePermissions = () => {
    if (selectedAdminId && newRole) {
      updateAdmin(selectedAdminId, { role: newRole });
      addNotification("Permissions updated successfully.", "success");
      closeModal();
    }
  };

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
                    const isProtected = admin.name === "Aadya Super Admin" || admin.id === "ADM001";

                    return (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.id}</TableCell>
                        <TableCell>{admin.name}</TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={isProtected
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-bg-primary text-text-primary border-border"
                            }
                          >
                            {admin.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              admin.status === "Active"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                            }
                          >
                            {admin.status}
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

                              {!isProtected && isSuperAdmin && (
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

                                  {admin.status === "Active" ? (
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
              <span className="text-muted-foreground">{selectedAdmin?.id}</span><br />
              <span className="text-muted-foreground">{selectedAdmin?.email}</span><br /><br />
              The administrator will no longer be able to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeactivate}>Deactivate Admin</Button>
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
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleActivate}>Activate Admin</Button>
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
                <span className="text-muted-foreground">{selectedAdmin?.id}</span><br />
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
              disabled={deleteConfirmText !== "DELETE"}
            >
              Delete Administrator
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
                Administrator: <strong className="text-foreground">{selectedAdmin?.name}</strong> ({selectedAdmin?.id})
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
                  <option value="System Admin">System Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Counsellor">Counsellor</option>
                  <option value="Accountant">Accountant</option>
                </select>
              </div>
              {newRole && newRole !== selectedAdmin?.role && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                  <strong>Note:</strong> You are changing this user's access level from <strong>{selectedAdmin?.role}</strong> to <strong>{newRole}</strong>.
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
