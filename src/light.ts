import { Inngest, referenceFunction } from "inngest";

export const lightClient = new Inngest({ id: "light-app" });

const heavyRef = referenceFunction({
  appId: "heavy-app",
  functionId: "heavy-fn",
});

export const lightFn = lightClient.createFunction(
  { id: "light-fn", triggers: [{ event: "light/start" }] },
  async ({ event, step }) => {
    await step.run("step-1", () => Promise.resolve("one"));
    await step.run("step-2", () => Promise.resolve("two"));
    await step.run("step-3", () => Promise.resolve("three"));

    await step.invoke("call-heavy", {
      function: heavyRef,
      data: { triggeredBy: (event.data as { index: number }).index },
    });

    return { done: true };
  },
);
