import "dotenv/config";

async function tryLogin(email: string, password: string) {
  const res = await fetch("http://localhost:5000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailOrPhone: email, password }),
  });
  const body = (await res.json()) as {
    message?: string;
    data?: { tokens?: { accessToken?: string }; accessToken?: string };
  };
  const token =
    body?.data?.tokens?.accessToken || body?.data?.accessToken || null;
  return { email, passwordUsed: password, status: res.status, token, message: body?.message };
}

async function main() {
  const passwords = [
    process.env.SEED_ADMIN_PASSWORD || "ChangeMe@123",
    "Admin@123",
    "password",
    "Aadya@123",
  ];
  const emails = [
    "admin@aadya.in",
    "admin@aadyainstitute.com",
    "admin@aadya.test",
  ];

  let hit: Awaited<ReturnType<typeof tryLogin>> | null = null;
  const attempts = [];
  for (const email of emails) {
    for (const password of passwords) {
      const r = await tryLogin(email, password);
      attempts.push({
        email: r.email,
        status: r.status,
        ok: Boolean(r.token),
        message: r.message,
      });
      if (r.token) {
        hit = r;
        break;
      }
    }
    if (hit) break;
  }

  if (!hit?.token) {
    console.log(JSON.stringify({ success: false, attempts }, null, 2));
    process.exit(2);
  }

  const testRes = await fetch(
    "http://localhost:5000/api/v1/integrations/AI_CALLING/test",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hit.token}`,
        "Content-Type": "application/json",
      },
    }
  );
  const testBody = await testRes.json();
  console.log(
    JSON.stringify(
      {
        success: true,
        loginAs: hit.email,
        testHttpStatus: testRes.status,
        testBody,
        serverNote:
          "Running server uses its process env. Restart backend if key was just updated.",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
