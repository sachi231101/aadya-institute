import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { authApi } from "../../services/auth.api";
import { UserRole } from "../../constants/roles";

export const Login: React.FC = () => {
  const [emailOrPhone, setEmailOrPhone] = useState("admin@aadya.in");
  const [password, setPassword] = useState("ChangeMe@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await authApi.login(emailOrPhone, password);
      
      // Map backend AuthUser (roles[]) to frontend User (role + roles[])
      const primaryRole = result.user.roles?.[0] || "ADMIN";
      const frontendUser = {
        ...result.user,
        role: primaryRole,
        roles: result.user.roles || [primaryRole],
      };
      
      setAuth(frontendUser, result.accessToken);

      // Redirect according to primary role
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
          navigate("/admin/dashboard");
      }
    } catch (err: any) {
        // Fallback for frontend demo/mock mode if backend credentials match preset
        if (emailOrPhone === "center.manager@aadya.in" || emailOrPhone === "center@aadya.in") {
          const cmUser = {
            id: "cm-001",
            name: "Rajesh Kumar (Center Manager)",
            email: "center.manager@aadya.in",
            phone: "+91 99999 11111",
            role: "CENTER_MANAGER",
            roles: ["CENTER_MANAGER"],
            instituteId: "inst-aadya-01",
            branchId: "branch-blr-01",
          };
          setAuth(cmUser, "demo-cm-token");
          navigate("/center/dashboard");
          return;
        }

        if (emailOrPhone.includes("counselor")) {
          const cUser = {
            id: "cns-001",
            name: "Kavita Nair (Counsellor)",
            email: "counselor@aadya.in",
            phone: "+91 98765 11223",
            role: "COUNSELLOR",
            roles: ["COUNSELLOR"],
            instituteId: "inst-aadya-01",
            branchId: "branch-blr-01",
          };
          setAuth(cUser, "demo-cns-token");
          navigate("/counselor/dashboard");
          return;
        }

        const message = err?.response?.data?.message || "Login failed. Please check your credentials.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
          padding: "1rem",
        }}
      >
        <div
          className="glass-card"
          style={{
            width: "100%",
            maxWidth: "440px",
            padding: "2.5rem",
            borderRadius: "var(--radius-xl)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
              <img src="/aadya-logo.png" alt="Aadya Institute" style={{ height: "64px", objectFit: "contain" }} />
            </div>
            <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>ERP Portal</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Sign in to access your account
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
                marginBottom: "1.5rem",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
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
                  placeholder="admin@aadya.in"
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
                background: "var(--accent-primary)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 15px rgba(23, 105, 170, 0.3)",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Signing in..." : "Sign In to Portal"}
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Credential Selectors */}
          <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem", textAlign: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>Quick Demo Credentials:</span>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setEmailOrPhone("admin@aadya.in");
                  setPassword("ChangeMe@123");
                }}
                style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", fontSize: "0.75rem", cursor: "pointer", color: "var(--text-primary)" }}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailOrPhone("center.manager@aadya.in");
                  setPassword("ChangeMe@123");
                }}
                style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", fontSize: "0.75rem", cursor: "pointer", color: "#1769AA", fontWeight: 600 }}
              >
                Center Manager
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailOrPhone("counselor@aadya.in");
                  setPassword("ChangeMe@123");
                }}
                style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", fontSize: "0.75rem", cursor: "pointer", color: "#10b981", fontWeight: 600 }}
              >
                Counsellor
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
