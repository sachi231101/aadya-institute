/**
 * Scheduler launcher — run separately from the API:
 *   npm run scheduler
 */
import { startCronJobs } from "./scheduler";

startCronJobs();
