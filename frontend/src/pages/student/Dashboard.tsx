import React from "react";
import { GraduationCap, Calendar, Video } from "lucide-react";

export const StudentDashboard: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Student Portal</h1>
        <p style={{ color: "var(--text-secondary)" }}>Welcome back! Track your course learning & schedules.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <GraduationCap size={24} color="var(--accent-secondary)" />
          <h3 style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>Fullstack Web Dev</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Enrolled Batch 12</p>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <Calendar size={24} color="var(--accent-primary)" />
          <h3 style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>Today 16:00</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Node.js & Prisma ORM Session</p>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <Video size={24} color="var(--accent-cyan)" />
          <h3 style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}>28 Recordings</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Available for replay</p>
        </div>
      </div>
    </div>
  );
};
