import React from "react";
import { UserCheck, PhoneCall, FileText } from "lucide-react";

export const CounselorDashboard: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Counselor Dashboard</h1>
        <p style={{ color: "var(--text-secondary)" }}>Lead Pipeline & Student Admissions</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <UserCheck size={24} color="var(--accent-emerald)" />
          <h3 style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>64 Leads</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Assigned to you</p>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <PhoneCall size={24} color="var(--accent-primary)" />
          <h3 style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>18 AI Followups</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Completed today</p>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <FileText size={24} color="var(--accent-secondary)" />
          <h3 style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>9 Admissions</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Confirmed this week</p>
        </div>
      </div>
    </div>
  );
};
