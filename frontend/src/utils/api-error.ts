/** Extract a user-facing message from Axios/API error payloads. */

type ApiFieldError = {
  field?: string;
  message?: string;
};

type ApiErrorBody = {
  message?: string;
  errors?: ApiFieldError[] | Record<string, string | string[]>;
};

const FIELD_LABELS: Record<string, string> = {
  title: "Class topic / title",
  batchId: "Batch",
  batchCourseId: "Course / subject",
  batchModuleId: "Module",
  facultyId: "Faculty",
  branchId: "Branch",
  scheduledDate: "Date",
  startTime: "Start time",
  endTime: "End time",
  timeslotMasterId: "Time slot",
  classroomMasterId: "Classroom",
  mode: "Class mode",
  roomNo: "Room",
};

const labelForField = (field?: string) => {
  if (!field) return "";
  return FIELD_LABELS[field] || field;
};

export const getApiErrorMessage = (
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string => {
  const axiosLike = err as {
    response?: { data?: ApiErrorBody; status?: number };
    message?: string;
  };
  const body = axiosLike?.response?.data;
  const errors = body?.errors;

  if (Array.isArray(errors) && errors.length > 0) {
    const parts = errors
      .map((e) => {
        const label = labelForField(e.field);
        const msg = e.message?.trim();
        if (!msg) return null;
        if (label && !msg.toLowerCase().includes(label.toLowerCase())) {
          return `${label}: ${msg}`;
        }
        return msg;
      })
      .filter(Boolean) as string[];
    if (parts.length > 0) return parts.join(". ");
  }

  if (errors && typeof errors === "object" && !Array.isArray(errors)) {
    const parts = Object.entries(errors).flatMap(([field, value]) => {
      const label = labelForField(field);
      const msgs = Array.isArray(value) ? value : [value];
      return msgs
        .filter(Boolean)
        .map((msg) => (label ? `${label}: ${msg}` : String(msg)));
    });
    if (parts.length > 0) return parts.join(". ");
  }

  if (body?.message && body.message !== "Validation failed") {
    return body.message;
  }

  if (body?.message === "Validation failed") {
    return "Please fill all required fields correctly.";
  }

  if (typeof axiosLike?.message === "string" && axiosLike.message && !axiosLike.message.startsWith("Request failed")) {
    return axiosLike.message;
  }

  return fallback;
};

export const isConflictError = (err: unknown): boolean => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 409;
};
