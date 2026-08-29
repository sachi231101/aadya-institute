import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const TOKEN = __ENV.TOKEN || "";
const EXAM_ID = __ENV.EXAM_ID || "";

export const options = {
  scenarios: {
    exam_peak: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 200 },
        { duration: "5m", target: 1000 },
        { duration: "3m", target: 1000 },
        { duration: "2m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<2000"],
  },
};

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

export default function () {
  if (!TOKEN || !EXAM_ID) {
    const health = http.get(`${BASE_URL}/api/v1/health`);
    check(health, { "health 200": (r) => r.status === 200 });
    sleep(1);
    return;
  }

  // Start (idempotent-ish — unique students needed for true 1000; this stresses endpoints)
  const start = http.post(
    `${BASE_URL}/api/v1/exams/student/${EXAM_ID}/start`,
    JSON.stringify({ clientDeviceInfo: { userAgent: "k6" } }),
    { headers }
  );
  check(start, { "start accepted": (r) => [200, 201, 403, 409].includes(r.status) });

  let attemptId = "";
  try {
    attemptId = start.json("data.id") || start.json("data.attempt.id") || "";
  } catch {
    attemptId = "";
  }

  if (attemptId) {
    const save = http.post(
      `${BASE_URL}/api/v1/exams/attempts/${attemptId}/answers`,
      JSON.stringify({
        answers: [{ questionId: "placeholder", selectedOptionIds: [], isFlagged: false }],
      }),
      { headers }
    );
    check(save, { "save status": (r) => [200, 400, 403, 404, 409].includes(r.status) });

    const submit = http.post(`${BASE_URL}/api/v1/exams/attempts/${attemptId}/submit`, null, {
      headers,
    });
    check(submit, { "submit accepted": (r) => [200, 403, 409].includes(r.status) });
  }

  sleep(0.5 + Math.random());
}
