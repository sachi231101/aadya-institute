import React from "react";
import { Building2, Users, Calendar } from "lucide-react";

export const CenterDashboard: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Center Manager Dashboard</h1>
        <p style={{ color: "var(--text-secondary)" }}>Branch Operations & Management — Main Campus</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <Building2 size={24} color="var(--accent-cyan)" />
          <h3 style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>Main Branch</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Bengaluru, KA</p>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <Users size={24} color="var(--accent-primary)" />
          <h3 style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>410 Students</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Active in branch</p>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <Calendar size={24} color="var(--accent-gold)" />
          <h3 style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>12 Batches</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Running currently</p>
        </div>
      </div>
    </div>
  );
};
