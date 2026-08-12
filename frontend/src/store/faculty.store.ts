/**
 * @deprecated — Faculty data is now fetched via TanStack Query hooks in `useFaculty.ts`.
 * This file is kept for backwards compatibility in case any external imports remain.
 * All mock data has been removed.
 */

import { create } from "zustand";

interface FacultyState {
  // Intentionally empty — all faculty data is now server state via TanStack Query.
}

export const useFacultyStore = create<FacultyState>(() => ({}));
