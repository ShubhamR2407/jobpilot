import { APP_NAME } from "@jobpilot/core";

async function main(): Promise<void> {
  console.log(
    `[${APP_NAME}] worker up. BullMQ queues + scrapers arrive in Step 1.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
