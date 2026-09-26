import type { ClipboardEvent, ChangeEvent } from "react";
import type { UseFormSetValue, FieldValues, Path, PathValue } from "react-hook-form";

/** Detect Google Maps-style "lat, lng" paste; returns null for a single number. */
export function parseLatLngPair(raw: string): { lat: number; lng: number } | null {
  const match = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

/** Parse a single decimal; empty → null; invalid → null (never NaN). */
export function parseOptionalFloat(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = parseFloat(trimmed);
  return Number.isNaN(n) ? null : n;
}

type LatLngFieldNames<T extends FieldValues> = {
  latitude: Path<T>;
  longitude: Path<T>;
};

const SET_OPTS = { shouldDirty: true, shouldValidate: true } as const;

/**
 * Paste handler for lat/lng text inputs.
 * When clipboard is "lat, lng", preventDefault and set both fields so type=number
 * sanitization / a follow-up onChange cannot clear the focused field.
 */
export function handleLatLngPaste<T extends FieldValues>(
  e: ClipboardEvent<HTMLInputElement>,
  setValue: UseFormSetValue<T>,
  fields: LatLngFieldNames<T>
): void {
  const pair = parseLatLngPair(e.clipboardData.getData("text"));
  if (!pair) return;
  e.preventDefault();
  e.stopPropagation();
  setValue(fields.latitude, pair.lat as PathValue<T, Path<T>>, SET_OPTS);
  setValue(fields.longitude, pair.lng as PathValue<T, Path<T>>, SET_OPTS);
}

/**
 * Change handler for a single lat or lng text input.
 * If the value contains a comma pair, set both; otherwise update only this field.
 * Never clears the sibling field when splitting fails or when typing a single value.
 */
export function handleLatLngChange<T extends FieldValues>(
  e: ChangeEvent<HTMLInputElement>,
  setValue: UseFormSetValue<T>,
  fields: LatLngFieldNames<T>,
  which: "latitude" | "longitude"
): void {
  const raw = e.target.value;
  const pair = parseLatLngPair(raw);
  if (pair) {
    setValue(fields.latitude, pair.lat as PathValue<T, Path<T>>, SET_OPTS);
    setValue(fields.longitude, pair.lng as PathValue<T, Path<T>>, SET_OPTS);
    return;
  }
  // Comma present but not a complete pair yet (mid-paste into text) — ignore
  // partial junk so we don't wipe the focused field with NaN.
  if (raw.includes(",")) return;

  const parsed = parseOptionalFloat(raw);
  setValue(
    which === "latitude" ? fields.latitude : fields.longitude,
    parsed as PathValue<T, Path<T>>,
    SET_OPTS
  );
}

export function formatLatLngDisplay(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? "" : String(value);
}
