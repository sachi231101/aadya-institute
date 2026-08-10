import React from "react";
import { BookOpen, CheckSquare, FileCheck } from "lucide-react";

export const FacultyDashboard: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Faculty Dashboard</h1>
        <p style={{ color: "var(--text-secondary)" }}>Teaching Schedule & Student Progress</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <BookOpen size={24} color="var(--accent-gold)" />
          <h3 style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>3 Sessions Today</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Next: React & TypeScript (14:00)</p>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <CheckSquare size={24} color="var(--accent-emerald)" />
          <h3 style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>96% Attendance</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Batch 12 average</p>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <FileCheck size={24} color="var(--accent-primary)" />
          <h3 style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>14 Submissions</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Pending evaluation</p>
        </div>
      </div>
    </div>
  );
};
