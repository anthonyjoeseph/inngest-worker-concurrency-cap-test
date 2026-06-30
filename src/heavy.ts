import { Inngest } from "inngest";
import os from "node:os";

export const heavyClient = new Inngest({ id: "heavy-app" });

const hostname = os.hostname();
let activeCount = 0;

export const heavyFn = heavyClient.createFunction(
  { id: "heavy-fn", triggers: [{ event: "heavy/run" }] },
  async ({ step }) => {
    await step.run("do-heavy-work", async () => {
      activeCount++;
      console.log(`[${hostname}][heavy] started — active: ${activeCount}`);

      await new Promise<void>((resolve) => setTimeout(resolve, 3000));

      console.log(`[${hostname}][heavy] done — active: ${activeCount}`);
      activeCount--;
    });

    return { ok: true };
  },
);
