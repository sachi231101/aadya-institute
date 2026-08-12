import React from "react";
import { Link, Navigate, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, Video, FileText, LogOut, Bell } from "lucide-react";
import { useAuthStore } from "../store/auth.store";

export const StudentLayout: React.FC = () => {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Student Portal", icon: LayoutDashboard, path: "/student/dashboard" },
    { label: "Class Schedule", icon: Calendar, path: "/student/schedule" },
    { label: "Attendance", icon: CheckSquare, path: "/student/attendance" },
    { label: "Video Recordings", icon: Video, path: "/student/recordings" },
    { label: "Assignments", icon: FileText, path: "/student/assignments" },
    { label: "Settings", icon: Settings, path: "/student/settings" },
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
              background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>Aadya Student</h2>
            <span style={{ fontSize: "0.75rem", color: "var(--accent-secondary)", fontWeight: 600 }}>
              LEARNER PORTAL
            </span>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
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
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  background: isActive ? "#1769AA" : "transparent",
                  fontWeight: isActive ? 600 : 500,
                  transition: "all 0.2s",
                }}
              >
                <Icon size={18} />
                <span style={{ fontSize: "0.9rem" }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            padding: "1rem 1rem 0",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginTop: "1.5rem",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {user?.name || "Student"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#ef4444",
              cursor: "pointer",
              padding: "0.6rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid #ef444430",
              background: "#ef444410",
              justifyContent: "center",
              fontSize: "0.9rem",
              fontWeight: 600,
              transition: "all 0.2s",
              width: "100%"
            }}
          >
            <LogOut size={16} />
            Logout
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
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Student Learning Portal</span>
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
