import { create } from 'zustand';

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
  lastLogin?: string;
  phone?: string;
  branch?: string;
}

const initialAdmins: Admin[] = [
  {
    id: 'ADM001',
    name: 'Adithya R',
    email: 'adithya@aadya.in',
    role: 'Super Admin',
    status: 'Active',
    lastLogin: '2026-08-11 10:23 AM',
    phone: '+91 9876543210',
    branch: 'Main Branch',
  },
  {
    id: 'ADM002',
    name: 'Sarah Connor',
    email: 'sarah@aadya.in',
    role: 'System Admin',
    status: 'Active',
    lastLogin: '2026-08-10 14:45 PM',
    phone: '+91 8765432109',
    branch: 'South Branch',
  },
];

interface AdminStore {
  admins: Admin[];
  setAdmins: (admins: Admin[]) => void;
  addAdmin: (admin: Admin) => void;
  updateAdmin: (id: string, updates: Partial<Admin>) => void;
  deleteAdmin: (id: string) => void;
  getAdminById: (id: string) => Admin | undefined;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  admins: initialAdmins,
  setAdmins: (admins) => set({ admins }),
  addAdmin: (admin) => set((state) => ({ admins: [...state.admins, admin] })),
  updateAdmin: (id, updates) =>
    set((state) => ({
      admins: state.admins.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  deleteAdmin: (id) =>
    set((state) => ({
      admins: state.admins.filter((a) => a.id !== id),
    })),
  getAdminById: (id) => {
    return get().admins.find((a) => a.id === id);
  },
}));
