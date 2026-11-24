import { definePlugin } from "nitro";
import { workMail } from "../../src/server/integrations";
import { closeStore } from "../../src/server/db";

export default definePlugin((app) => {
  let current: Promise<void> | undefined;
  const timer = setInterval(() => {
    current ??= workMail()
      .catch(() => console.error(JSON.stringify({ level: "error", task: "workMail" })))
      .finally(() => { current = undefined; });
  }, 4000);
  timer.unref();
  app.hooks.hook("close", async () => {
    clearInterval(timer);
    await current;
    await closeStore();
  });
});
