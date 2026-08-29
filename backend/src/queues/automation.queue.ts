import { createQueue, createWorker } from "./queue";

export interface AutomationJob {
  trigger: string;
  payload: Record<string, unknown>;
}

export const automationQueue = createQueue("automation");

export const automationWorker = createWorker<AutomationJob>(
  "automation",
  async (job) => {
    console.info("[automation] Processing trigger:", job.data.trigger);
    // TODO: route to automation engine
  },
  { concurrency: 2, peakConcurrency: 1, pauseInPeakMode: true }
);
