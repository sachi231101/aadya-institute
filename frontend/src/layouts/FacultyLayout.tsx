import React from "react";
import { Link, Navigate, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, CheckSquare, BookOpen, FileCheck, LogOut, Bell } from "lucide-react";
import { useAuthStore } from "../store/auth.store";

export const FacultyLayout: React.FC = () => {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Faculty Dashboard", icon: LayoutDashboard, path: "/faculty/dashboard" },
    { label: "Classes & Sessions", icon: BookOpen, path: "/faculty/classes" },
    { label: "Mark Attendance", icon: CheckSquare, path: "/faculty/attendance" },
    { label: "Assignments", icon: FileCheck, path: "/faculty/assignments" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0 0.5rem 1.5rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
            }}
          >
            F
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>Faculty Portal</h2>
            <span style={{ fontSize: "0.75rem", color: "var(--accent-gold)", fontWeight: 600 }}>
              FACULTY MEMBER
            </span>
          </div>
        </div>

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
                }}
              >
                <Icon size={18} />
                <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

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
              {user?.name || "Faculty"}
            </p>
          </div>
          <button onClick={handleLogout} style={{ color: "#ef4444", cursor: "pointer" }}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Faculty Teaching Portal</span>
          <button style={{ color: "var(--text-secondary)" }}>
            <Bell size={20} />
          </button>
        </header>
        <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
