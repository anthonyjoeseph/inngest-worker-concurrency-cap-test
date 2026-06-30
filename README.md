# Inngest Worker Concurrency Cap Test

https://github.com/user-attachments/assets/1db2f6a4-6440-4394-b496-df134da59ce2

## Run locally

```sh
docker compose up --build -d
./scripts/seed.sh
```

# Explanation

## The Problem

Some inngest steps will require a lot of memory or cpu. In this case, it usually makes sense to horizontally scale your workers.

Inngest has built-in concurrency controls - [docs](https://www.inngest.com/docs/guides/concurrency) - but they're not helpful here. They're scoped to functions, accounts or environments rather than individual steps, and they're worker-machine agnostic. They're meant to avoid overwhelming _external_ resources, but here we're concerned with _internal_ resources

By default, inngest has no notion of resource 'burden' per-worker or per-step. It might schedule the all of 'heavy' steps on the same worker, and distribute the lighter steps among the rest.

This could be disastrous, but it's intentional - inngest, as an abstraction, 'encapsulates' the workers. The scheduler is protective and vain, and a developer may not interfere.

## The Solution

The solution hinges on this feature - an inngest ‘connection’ is able to set its own `maxConcurrentSteps` - [docs](https://www.inngest.com/docs/setup/connect#deploying-to-production). In fact, it's recommended!

```ts
await connect({
  apps: [...],
  maxWorkerConcurrency: 2,
})
```

This value is global - referring to _any_ step in the app - but that’s ok! We’re able to create a connection with a single step

```ts
const heavyClient = new Inngest({ id: "heavy-app" });

export const heavyFn = heavyClient.createFunction(
  { id: "heavy-fn", triggers: [{ event: "heavy/run" }] },
  async ({ step }) => {
    await step.run("do-heavy-work", async () => {
      // ...
    });
  },
);

await connect({
  apps: [{ client: heavyClient, functions: [heavyFn] }],
  maxWorkerConcurrency: 2,
});
```

This is the ‘heavy’ step. This way, the 'heavy' step gets its very own separate horizontally-scalable hardware

Then we’re able create a separate connection - our 'light' app. This app can use `referenceFunction` to invoke our 'heavy' step,

```ts
export const lightClient = new Inngest({ id: "light-app" });

export const lightFn = lightClient.createFunction(
  { id: "light-fn", triggers: [{ event: "light/start" }] },
  async ({ event, step }) => {
    await step.run("light-step", () => console.log("light step"));
    await step.invoke("call-heavy", {
      function: referenceFunction({
        appId: "heavy-app",
        functionId: "heavy-fn",
      }),
      data: event.data.heavy,
    });
  },
);

connect({
  apps: [{ client: lightClient, functions: [lightFn] }],
  // note: no maxWorkerConcurrency for the 'light' app
});
```

Invoking `call-heavy` will safely max out each worker, and queue as necessary

I’ve also discovered that an inngest worker can run two connections at the same time(!) So, if desired, the worker can potentially run the ‘lighter’ app in the background alongside the ‘heavy’ app.

```ts
await Promise.all([
  connect({
    apps: [{ client: heavyClient, functions: [heavyFn] }],
    maxWorkerConcurrency: 2,
  }),
  connect({
    apps: [{ client: lightClient, functions: [lightFn] }],
  }),
]);
```

This is probably not desired in most cases, but it might be useful in some cases where compute is truly limited

## So What Does This Repo Do?

It spins up two ‘workers’. Each worker has two connections - a ‘light’ one and a ‘heavy’ one. Each ‘heavy’ app has `maxConcurrentSteps` set to 2

Then it seeds the ‘light’ app with 12 events.

You can watch the video and see - only 4 'heavy' steps (2 per worker) are ever running concurrently, as the rest are ‘queued’ behind them. Perfect!

The ‘light’ app is blissfully ignorant of the worker’s limits - each worker is totally in control of their own concurrency (which can be easily swapped out as an env var)
