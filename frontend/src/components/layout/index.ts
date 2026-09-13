/**
 * Page chrome conventions (UI simplification):
 *
 * - One PageHeader per page; title is text only — no decorative icon box in the title.
 * - Description: one short sentence or omit; no marketing copy.
 * - List KPIs: max 4 metrics via MetricGrid; number + label only (no colored Lucide wells).
 * - No welcome/gradient/blur heroes; exception: live-class / urgent operational banners only.
 * - Detail pages: do not repeat name/code/status in a second hero if already in PageHeader.
 * - Actions: 1–2 primary CTAs in header; extras in DropdownMenu or when selection exists.
 * - Filters: flat FilterToolbar; avoid nested Card wrapping the whole filter bar.
 * - Type weight: font-semibold / font-bold on chrome; avoid font-black / font-extrabold.
 * - Surfaces: layout cards rounded-xl; design tokens over shell hex colors.
 * - Target baseline: CourseDetails (header + focused content).
 */
export { PageContainer } from "./PageContainer";
export type { PageContainerProps } from "./PageContainer";
export { PageHeader } from "./PageHeader";
export type { PageHeaderProps } from "./PageHeader";
export { PageSection } from "./PageSection";
export type { PageSectionProps } from "./PageSection";
export { FilterToolbar } from "./FilterToolbar";
export type { FilterToolbarProps } from "./FilterToolbar";
export { MetricGrid, METRIC_GRID_COLUMNS } from "./MetricGrid";
export type { MetricGridProps } from "./MetricGrid";
