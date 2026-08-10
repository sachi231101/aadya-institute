import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  LogOut,
  Bell,
  Building2,
} from "lucide-react";
import { useAuthStore } from "../store/auth.store";

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    { label: "Students", icon: GraduationCap, path: "/admin/students" },
    { label: "Faculty", icon: Users, path: "/admin/faculty" },
    { label: "Courses", icon: BookOpen, path: "/admin/courses" },
    { label: "Batches", icon: Calendar, path: "/admin/batches" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "260px",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem 1rem",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0 0.5rem 1.5rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #6366f1, #ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
            }}
          >
            A
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>Aadya Portal</h2>
            <span style={{ fontSize: "0.75rem", color: "var(--accent-primary)", fontWeight: 600 }}>
              SUPER ADMIN
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-secondary)",
                  transition: "all 0.2s",
                }}
              >
                <Icon size={18} />
                <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div
          style={{
            padding: "1rem 0.5rem 0",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {user?.name || "Aadya Admin"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{user?.email || "admin@aadya.in"}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              color: "#ef4444",
              padding: "0.5rem",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
            }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top Header */}
        <header
          style={{
            height: "70px",
            background: "var(--bg-secondary)",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)" }}>
            <Building2 size={18} />
            <span style={{ fontSize: "0.9rem" }}>Main Campus — Bengaluru</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button style={{ position: "relative", color: "var(--text-secondary)", cursor: "pointer" }}>
              <Bell size={20} />
              <span
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-2px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--accent-secondary)",
                }}
              />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
