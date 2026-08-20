import React from "react";
import { FacultyTimetable } from "@/pages/admin/faculty/FacultyTimetable";

export const FacultyDashboard: React.FC = () => {
  return (
    <div className="p-6 max-w-[1680px] mx-auto">
      <FacultyTimetable />
    </div>
  );
};
