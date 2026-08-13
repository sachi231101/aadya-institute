import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  Shield,
  Building2,
  UserCheck,
  GraduationCap,
  Users,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { authApi } from "../../services/auth.api";
import { UserRole } from "../../constants/roles";

interface RoleCardConfig {
  id: string;
  name: string;
  roleEnum: string;
  badgeTag: string;
  description: string;
  email: string;
  color: string;
  bgColor: string;
  borderColor: string;
  activeBg: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
  dashboardPath: string;
  demoUser: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    roles: string[];
    instituteId: string;
    branchId: string;
  };
}

const ROLE_CARDS: RoleCardConfig[] = [
  {
    id: "admin",
    name: "Admin",
    roleEnum: UserRole.ADMIN,
    badgeTag: "Full System Control",
    description: "Access institute configuration, multi-branch overview, user access permissions, financial reports, and global settings.",
    email: "admin@aadya.in",
    color: "#334155",
    bgColor: "rgba(241, 245, 249, 0.9)",
    borderColor: "#cbd5e1",
    activeBg: "rgba(226, 232, 240, 1)",
    icon: Shield,
    dashboardPath: "/admin/dashboard",
    demoUser: {
      id: "aadya-initial-admin",
      name: "Aadya System Admin",
      email: "admin@aadya.in",
      phone: "+91 99999 99999",
      role: "ADMIN",
      roles: ["ADMIN"],
      instituteId: "inst-aadya-01",
      branchId: "branch-blr-01",
    },
  },
  {
    id: "center_manager",
    name: "Center Manager",
    roleEnum: UserRole.CENTER_MANAGER,
    badgeTag: "Branch Operations",
    description: "Manage branch admissions, batches, timetables, attendance summaries, faculty rosters, and branch-level analytics.",
    email: "center.manager@aadya.in",
    color: "#1769AA",
    bgColor: "rgba(239, 246, 255, 0.9)",
    borderColor: "#93c5fd",
    activeBg: "rgba(219, 234, 254, 1)",
    icon: Building2,
    dashboardPath: "/center/dashboard",
    demoUser: {
      id: "cm-001",
      name: "Rajesh Kumar (Center Manager)",
      email: "center.manager@aadya.in",
      phone: "+91 99999 11111",
      role: "CENTER_MANAGER",
      roles: ["CENTER_MANAGER"],
      instituteId: "inst-aadya-01",
      branchId: "branch-blr-01",
    },
  },
  {
    id: "counselor",
    name: "Counsellor",
    roleEnum: UserRole.COUNSELLOR,
    badgeTag: "Leads & AI Calling",
    description: "Review prospective student leads, view Sarvam AI call transcripts & summaries, track follow-up tasks, and add counselor notes.",
    email: "counselor@aadya.in",
    color: "#10b981",
    bgColor: "rgba(236, 253, 245, 0.9)",
    borderColor: "#6ee7b7",
    activeBg: "rgba(209, 250, 229, 1)",
    icon: UserCheck,
    dashboardPath: "/counselor/dashboard",
    demoUser: {
      id: "cns-001",
      name: "Kavita Nair (Counsellor)",
      email: "counselor@aadya.in",
      phone: "+91 98765 11223",
      role: "COUNSELLOR",
      roles: ["COUNSELLOR"],
      instituteId: "inst-aadya-01",
      branchId: "branch-blr-01",
    },
  },
  {
    id: "faculty",
    name: "Faculty",
    roleEnum: UserRole.FACULTY,
    badgeTag: "Teaching Desk",
    description: "View daily class schedules, mark student attendance, publish module assignments, review student submissions, and upload recordings.",
    email: "faculty@aadya.in",
    color: "#d97706",
    bgColor: "rgba(254, 243, 199, 0.9)",
    borderColor: "#fde68a",
    activeBg: "rgba(253, 230, 138, 1)",
    icon: GraduationCap,
    dashboardPath: "/faculty/dashboard",
    demoUser: {
      id: "fac-001",
      name: "Prof. Dr. Rajesh Sharma (Faculty)",
      email: "faculty@aadya.in",
      phone: "+91 98765 99887",
      role: "FACULTY",
      roles: ["FACULTY"],
      instituteId: "inst-aadya-01",
      branchId: "branch-blr-01",
    },
  },
  {
    id: "student",
    name: "Student",
    roleEnum: UserRole.STUDENT,
    badgeTag: "Learning Portal",
    description: "Check timetable, track class attendance history, watch class recordings, submit assignments, and submit batch feedback.",
    email: "student@aadya.in",
    color: "#8b5cf6",
    bgColor: "rgba(245, 243, 255, 0.9)",
    borderColor: "#ddd6fe",
    activeBg: "rgba(237, 233, 254, 1)",
    icon: Users,
    dashboardPath: "/student/dashboard",
    demoUser: {
      id: "stu-001",
      name: "Rahul Verma (Student)",
      email: "student@aadya.in",
      phone: "+91 98765 44332",
      role: "STUDENT",
      roles: ["STUDENT"],
      instituteId: "inst-aadya-01",
      branchId: "branch-blr-01",
    },
  },
];

export const Login: React.FC = () => {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("ChangeMe@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const currentRole = ROLE_CARDS.find((r) => r.id === selectedRoleId) || null;

  const handleSelectRoleCard = (roleConfig: RoleCardConfig) => {
    setSelectedRoleId(roleConfig.id);
    setEmailOrPhone(roleConfig.email);
    setPassword("ChangeMe@123");
    setError("");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRole) return;

    setLoading(true);
    setError("");

    try {
      const result = await authApi.login(emailOrPhone, password);
      
      const primaryRole = result.user.roles?.[0] || currentRole.roleEnum;
      const frontendUser = {
        ...result.user,
        role: primaryRole,
        roles: result.user.roles || [primaryRole],
      };
      
      setAuth(frontendUser, result.accessToken);

      switch (primaryRole) {
        case UserRole.ADMIN:
          navigate("/admin/dashboard");
          break;
        case UserRole.CENTER_MANAGER:
          navigate("/center/dashboard");
          break;
        case UserRole.COUNSELLOR:
          navigate("/counselor/dashboard");
          break;
        case UserRole.FACULTY:
          navigate("/faculty/dashboard");
          break;
        case UserRole.STUDENT:
          navigate("/student/dashboard");
          break;
        default:
          navigate(currentRole.dashboardPath);
      }
    } catch (err: any) {
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err?.message && !err?.response) {
        // Only fallback to demo user if network error / server unreachable
        setAuth(currentRole.demoUser, `demo-${currentRole.id}-token`);
        navigate(currentRole.dashboardPath);
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary, #f8fafc) 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem", maxWidth: "600px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
          <img src="/aadya-logo.png" alt="Aadya Institute" style={{ height: "68px", objectFit: "contain" }} />
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Aadya Institute ERP & Automation Platform
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.35rem" }}>
          {selectedRoleId
            ? `Sign in below to access the ${currentRole?.name} Portal`
            : "Select a Role Portal card below to sign in to your dashboard"}
        </p>
      </div>

      {/* STEP 1: 5 PORTAL CARDS GRID (When no role card is selected) */}
      {!selectedRoleId ? (
        <div style={{ width: "100%", maxWidth: "1150px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.25rem",
              justifyContent: "center",
              alignItems: "stretch",
            }}
          >
            {ROLE_CARDS.map((role) => (
              <div
                key={role.id}
                onClick={() => handleSelectRoleCard(role)}
                style={{
                  flex: "1 1 300px",
                  maxWidth: "350px",
                  minWidth: "280px",
                  background: "var(--bg-card, #ffffff)",
                  border: `2px solid ${role.borderColor}`,
                  borderRadius: "16px",
                  padding: "1.35rem 1.25rem",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 4px 18px rgba(0, 0, 0, 0.04)",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.boxShadow = `0 12px 28px ${role.color}25`;
                  e.currentTarget.style.borderColor = role.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 18px rgba(0, 0, 0, 0.04)";
                  e.currentTarget.style.borderColor = role.borderColor;
                }}
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: role.bgColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <role.icon size={24} style={{ color: role.color }} />
                    </div>
                    <span
                      style={{
                        padding: "0.25rem 0.6rem",
                        borderRadius: "20px",
                        background: role.bgColor,
                        color: role.color,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        border: `1px solid ${role.borderColor}`,
                      }}
                    >
                      {role.badgeTag}
                    </span>
                  </div>

                  {/* Role Title & Description */}
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                    {role.name}
                  </h2>
                  <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", lineHeight: 1.45, marginBottom: "1rem" }}>
                    {role.description}
                  </p>
                </div>

                {/* Card Action Button */}
                <div
                  style={{
                    padding: "0.65rem 0.9rem",
                    borderRadius: "10px",
                    background: role.bgColor,
                    color: role.color,
                    fontWeight: 700,
                    fontSize: "0.825rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: `1px solid ${role.borderColor}`,
                    transition: "all 0.2s",
                  }}
                >
                  <span>Sign In to {role.name}</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* STEP 2: DEDICATED ROLE SIGN IN CARD (When a role card is clicked) */
        <div style={{ width: "100%", maxWidth: "480px" }}>
          {/* Back Button */}
          <button
            type="button"
            onClick={() => setSelectedRoleId(null)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "1rem",
              padding: "0.4rem 0.6rem",
              borderRadius: "8px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.background = "rgba(0,0,0,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.background = "none";
            }}
          >
            <ArrowLeft size={18} />
            <span>Back to All Role Dashboards</span>
          </button>

          {/* Sign In Glass Box */}
          <div
            className="glass-card"
            style={{
              width: "100%",
              padding: "2.5rem 2rem",
              borderRadius: "var(--radius-xl)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08)",
              border: `2px solid ${currentRole?.borderColor}`,
            }}
          >
            {/* Header with active role badge */}
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  background: currentRole?.bgColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem auto",
                  border: `1px solid ${currentRole?.borderColor}`,
                }}
              >
                {currentRole && <currentRole.icon size={30} style={{ color: currentRole.color }} />}
              </div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                {currentRole?.name} Portal
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Enter credentials to access your account
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#ef4444",
                  fontSize: "0.85rem",
                  marginBottom: "1.25rem",
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Email or Phone Number
                </label>
                <div style={{ position: "relative" }}>
                  <Mail
                    size={18}
                    style={{
                      position: "absolute",
                      left: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    required
                    placeholder={currentRole?.email}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem 0.75rem 2.75rem",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={18}
                    style={{
                      position: "absolute",
                      left: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem 0.75rem 2.75rem",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  marginTop: "0.5rem",
                  borderRadius: "var(--radius-md)",
                  background: currentRole?.color,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: `0 4px 15px ${currentRole?.color}44`,
                  transition: "all 0.2s",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                {loading ? "Signing in..." : `Sign In to ${currentRole?.name} Dashboard`}
                <ArrowRight size={18} />
              </button>
            </form>

            {/* Quick Switch Role Bar */}
            <div style={{ marginTop: "1.75rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)", textAlign: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: "0.5rem" }}>
                Switch to another portal:
              </span>
              <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center", flexWrap: "wrap" }}>
                {ROLE_CARDS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRoleCard(r)}
                    style={{
                      padding: "0.3rem 0.6rem",
                      borderRadius: "6px",
                      background: r.id === selectedRoleId ? r.activeBg : "var(--bg-tertiary)",
                      border: `1px solid ${r.id === selectedRoleId ? r.color : "var(--border-color)"}`,
                      fontSize: "0.75rem",
                      fontWeight: r.id === selectedRoleId ? 700 : 500,
                      cursor: "pointer",
                      color: r.color,
                    }}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


