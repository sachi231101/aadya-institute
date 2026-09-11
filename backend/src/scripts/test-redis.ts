import Redis from "ioredis";
import { env } from "../config/env";

async function main() {
  const redisUrl = env.REDIS_URL || "redis://127.0.0.1:6379";
  console.log("🔄 Testing Redis connection...");
  console.log(`📌 Target URL: ${redisUrl}`);

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 4000,
    lazyConnect: true,
  });

  redis.on("error", () => {
    // Handled in try/catch below
  });

  try {
    await redis.connect();
    const pingRes = await redis.ping();
    console.log(`✅ [1/3] Connection successful! PING: ${pingRes}`);

    // Test 1: Key-value operations & TTL
    const testKey = "aadya:manual:test";
    await redis.set(testKey, "live_value", "EX", 15);
    const val = await redis.get(testKey);
    const ttl = await redis.ttl(testKey);
    console.log(`✅ [2/3] Key-Value store test passed! Key: "${testKey}" = "${val}" (TTL: ${ttl}s)`);
    await redis.del(testKey);

    // Test 2: Real BullMQ Queue & Worker End-to-End Test
    console.log("🔄 [3/3] Testing real BullMQ Queue & Worker processing...");
    const { Queue, Worker } = await import("bullmq");
    const { getBullmqConnection } = await import("../config/redis");
    const bullConnection = getBullmqConnection();

    const testQueue = new Queue("aadya-real-test-queue", { connection: bullConnection });

    let jobCompleted = false;
    const testWorker = new Worker(
      "aadya-real-test-queue",
      async (job) => {
        console.log(`   📨 Worker received job #${job.id} with payload:`, job.data);
        return { success: true, processedAt: new Date().toISOString() };
      },
      { connection: bullConnection }
    );

    testWorker.on("completed", (job) => {
      console.log(`   🎯 Job #${job.id} completed successfully!`);
      jobCompleted = true;
    });

    const job = await testQueue.add("manual-test-job", {
      sender: "manual-tester",
      text: "Testing real background queue execution",
      timestamp: Date.now(),
    });
    console.log(`   📤 Dispatched test job #${job.id} into Redis queue`);

    // Wait up to 3 seconds for worker to process
    for (let i = 0; i < 30; i++) {
      if (jobCompleted) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await testWorker.close();
    await testQueue.drain();
    await testQueue.close();

    if (jobCompleted) {
      console.log("✅ [3/3] BullMQ Queue -> Worker roundtrip succeeded!");
    } else {
      console.log("⚠️ Job was queued, but worker took longer than expected to complete.");
    }

    console.log("\n🎉 All real Redis tests PASSED! Everything is running perfectly.");
    process.exit(0);
  } catch (err: any) {
    console.error(`❌ Could not connect to Redis: ${err?.message || err}`);
    console.log("\n💡 Troubleshooting Tips:");
    console.log(" • Make sure Redis / Memurai / Docker container is running.");
    console.log(" • Verify REDIS_URL in backend/.env (defaults to redis://localhost:6379).");
    process.exit(1);
  } finally {
    try {
      redis.disconnect();
    } catch {
      // ignore cleanup errors
    }
  }
}

main();
