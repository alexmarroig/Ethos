import { createEthosBackend } from "./server";
import { startNotificationDispatcher } from "./application/notifications";
import { startSessionReminderWorker } from "./application/sessionReminderWorker";
import { startBillingReminderWorker } from "./application/billingReminderWorker";
import { loadFromFile, saveToFile, startAutosave } from "./infra/persist";
import { deduplicateAndRepairSeeds } from "./infra/database";

async function main() {
  await loadFromFile();
  deduplicateAndRepairSeeds(); // remove email duplicates left by old persist bug
  startAutosave(30_000);

  const port = Number(process.env.PORT ?? 8787);
  const server = createEthosBackend();
  startNotificationDispatcher();
  startSessionReminderWorker();
  startBillingReminderWorker();

  server.listen(port, "0.0.0.0", () => {
    process.stdout.write(`ETHOS backend listening on ${port}\n`);
  });

  process.on("SIGTERM", () => {
    saveToFile();
    process.exit(0);
  });
}

main().catch((err) => {
  process.stderr.write(`[startup] Fatal error: ${String(err)}\n`);
  process.exit(1);
});
