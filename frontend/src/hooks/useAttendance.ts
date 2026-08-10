import { useState } from "react";
import { attendanceApi } from "../services/attendance.api";

export const useAttendance = () => {
  const [submitting, setSubmitting] = useState(false);

  const markAttendance = async (data: any) => {
    setSubmitting(true);
    try {
      return await attendanceApi.mark(data);
    } finally {
      setSubmitting(false);
    }
  };

  return { markAttendance, submitting };
};
