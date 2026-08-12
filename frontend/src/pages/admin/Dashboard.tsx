import React from "react";
import { Users, GraduationCap, BookOpen, Calendar, Activity, PhoneCall, MessageSquare, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useBranches } from "@/hooks/useBranches";
import { useBranchStats } from "@/hooks/useBranches";

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();

  // Fetch all branches to get the first one for stats
  const { data: branchesResponse, isLoading: branchesLoading } = useBranches();
  const branches = branchesResponse?.data ?? [];
  const primaryBranchId = user?.branchId || branches[0]?.id;

  // Fetch stats for the primary branch
  const { data: statsResponse, isLoading: statsLoading } = useBranchStats(primaryBranchId);
  const branchStats = statsResponse?.data;

  const isLoading = branchesLoading || statsLoading;

  const stats = [
    {
      label: "Total Students",
      value: isLoading ? "—" : String(branchStats?.totalStudents ?? 0),
      icon: GraduationCap,
      color: "#6366f1",
    },
    {
      label: "Faculty Members",
      value: isLoading ? "—" : String(branchStats?.totalFaculty ?? 0),
      icon: Users,
      color: "#ec4899",
    },
    {
      label: "Active Batches",
      value: isLoading ? "—" : String(branchStats?.totalBatches ?? 0),
      icon: Calendar,
      color: "#f59e0b",
    },
    {
      label: "Admissions",
      value: isLoading ? "—" : String(branchStats?.totalAdmissions ?? 0),
      icon: BookOpen,
      color: "#06b6d4",
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Admin Dashboard</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Institute Overview & Core Metrics — Aadya Educational System
        </p>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{stat.label}</span>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: `${stat.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: stat.color,
                  }}
                >
                  <Icon size={20} />
                </div>
              </div>
              {isLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-secondary)" }} />
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading...</span>
                </div>
              ) : (
                <h2 style={{ fontSize: "1.8rem", color: "var(--text-primary)" }}>{stat.value}</h2>
              )}
            </div>
          );
        })}
      </div>

      {/* Analytics & Quick Action Section */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Activity size={20} color="var(--accent-primary)" />
            Recent Activity & System Logs
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--accent-emerald)" }}>[SYSTEM]</span> Activity logs will be connected in a future update.
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>AI & Integrations</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <PhoneCall size={20} color="var(--accent-cyan)" />
              <div>
                <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>AI Voice Agent</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Will be connected in Phase 2</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <MessageSquare size={20} color="var(--accent-emerald)" />
              <div>
                <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>WhatsApp Webhooks</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Will be connected in Phase 2</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
