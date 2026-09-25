import { test, describe } from "node:test";
import assert from "node:assert";
import { classSessionRepository } from "../modules/class-sessions/class-session.repository";
import { classSessionService } from "../modules/class-sessions/class-session.service";

describe("getActiveLiveSessions IST window filter", () => {
  test("past-window LIVE is excluded; during-window LIVE is kept", async (t) => {
    // 2026-09-24 16:30 IST = 2026-09-24 11:00 UTC
    const now = new Date("2026-09-24T11:00:00.000Z");

    const pastSession = {
      id: "session-past-live",
      scheduledDate: new Date(Date.UTC(2026, 8, 24, 12, 0, 0)),
      startTime: "10:00 AM",
      endTime: "11:00 AM",
      sessionStatus: "LIVE",
      facultyId: "faculty-1",
      batchId: "batch-1",
    };

    const duringSession = {
      id: "session-during-live",
      scheduledDate: new Date(Date.UTC(2026, 8, 24, 12, 0, 0)),
      startTime: "4:00 PM",
      endTime: "5:00 PM",
      sessionStatus: "LIVE",
      facultyId: "faculty-1",
      batchId: "batch-1",
    };

    const missingDateSession = {
      id: "session-missing-date",
      scheduledDate: null,
      startTime: "4:00 PM",
      endTime: "5:00 PM",
      sessionStatus: "LIVE",
      facultyId: "faculty-1",
      batchId: "batch-1",
    };

    t.mock.method(classSessionRepository, "findActiveLiveSessions", async () => [
      pastSession,
      duringSession,
      missingDateSession,
    ]);

    const result = await classSessionService.getActiveLiveSessions(
      "institute-1",
      undefined,
      undefined,
      undefined,
      undefined,
      now
    );

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, "session-during-live");
    assert.ok(!result.some((s) => s.id === "session-past-live"));
    assert.ok(!result.some((s) => s.id === "session-missing-date"));
  });
});
