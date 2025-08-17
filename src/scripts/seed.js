const { exec } = require("child_process");

// After cleanDatabase() or dropDatabase(), call this:
exec("npx prisma db seed", (err, stdout, stderr) => {
  if (err) {
    console.error("❌ Error seeding database:", stderr);
  } else {
    console.log("🌱 Database seeded successfully:");
    console.log(stdout);
  }
});


| Method                      | Keeps Schema | Deletes All Data | Fast | Works With Prisma       | Danger Level |
| --------------------------- | ------------ | ---------------- | ---- | ----------------------- | ------------ |
| `PrismaClient.deleteMany()` | ✅            | ✅                | ⚡    | ✅                       | Low          |
| MongoDB `dropDatabase()`    | ❌            | ✅ (All gone)     | ⚡⚡   | ❌ (Native only)         | High         |
| Drop all collections        | ❌            | ✅                | ⚡    | ❌ (Native only)         | Medium       |
| `prisma migrate reset`      | ✅            | ✅                | ⚡    | ❌ (Mongo not supported) | ❌ N/A        |
