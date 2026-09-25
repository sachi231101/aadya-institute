export const CONTINUE_STUDENT_DIALOG_DESCRIPTION =
  "Reactivate the student and restore their previous batch if it is still open and has capacity. If restore is not possible, assign a batch from Student Allocation.";

export function studentAllocationPath(
  basePath: string,
  options?: { search?: string }
): string {
  const path = `${basePath}/students/student-allocation`;
  const search = options?.search?.trim();
  if (!search) return path;
  return `${path}?search=${encodeURIComponent(search)}`;
}

export function continueSuccessMessage(options: {
  batchRestored: boolean;
  batchCode?: string;
  batchNotRestoredSuffix?: string;
}): string {
  const { batchRestored, batchCode, batchNotRestoredSuffix } = options;
  if (batchRestored) {
    return batchCode
      ? ` Previous batch ${batchCode} was restored.`
      : " Previous batch enrollment was restored.";
  }
  return (
    batchNotRestoredSuffix ??
    " They are active but unassigned — assign a batch from Student Allocation."
  );
}
