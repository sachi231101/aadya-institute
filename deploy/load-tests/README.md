/**
 * k6 load scenarios for Aadya (mixed traffic + exam peak).
 *
 * Install: https://k6.io/docs/get-started/installation/
 *
 * Baseline mix:
 *   k6 run -e BASE_URL=https://YOUR_DOMAIN -e TOKEN=eyJ... deploy/load-tests/k6-mixed.js
 *
 * Exam peak (scale VUs carefully against staging first):
 *   k6 run -e BASE_URL=https://YOUR_DOMAIN -e TOKEN=eyJ... -e EXAM_ID=... deploy/load-tests/k6-exam-peak.js
 *
 * Pass bars (guide):
 * - http_req_failed < 1% on non-exam routes during mixed
 * - exam autosave p95 < 500ms under target VUs
 * - submit accept < 1s (grading may be async)
 */
export {};
