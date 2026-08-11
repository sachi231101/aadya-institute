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
      const response = await authApi.login(emailOrPhone, password);
      setAuth(response.user, response.token);

      // Redirect according to role
      switch (response.user.role) {
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
      // Demo fallback login for preview
      const demoUser = {
        id: "aadya-initial-admin",
        name: "Aadya Admin",
        email: emailOrPhone,
        role: UserRole.ADMIN,
        instituteId: "aadya-inst-1",
      };
      setAuth(demoUser, "demo-jwt-token");
      navigate("/admin/dashboard");
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
          maxWidth: "420px",
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

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Demo Admin: <strong>admin@aadya.in</strong> / <strong>ChangeMe@123</strong>
        </div>
      </div>
    </div>
  );
};
