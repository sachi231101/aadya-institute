import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const TOKEN = __ENV.TOKEN || "";

export const options = {
  scenarios: {
    mixed: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 },
        { duration: "3m", target: 100 },
        { duration: "1m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
  },
};

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

export default function () {
  const health = http.get(`${BASE_URL}/api/v1/health`);
  check(health, { "health 200": (r) => r.status === 200 });

  if (TOKEN) {
    const me = http.get(`${BASE_URL}/api/v1/auth/me`, { headers });
    check(me, { "me ok": (r) => r.status === 200 || r.status === 401 });

    const unread = http.get(`${BASE_URL}/api/v1/notifications/unread-count`, { headers });
    check(unread, { "unread ok": (r) => r.status === 200 || r.status === 401 || r.status === 403 });
  }

  sleep(1 + Math.random());
}
