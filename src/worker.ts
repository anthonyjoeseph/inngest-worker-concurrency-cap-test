import { connect } from "inngest/connect";
import { heavyClient, heavyFn } from "./heavy.js";
import { lightClient, lightFn } from "./light.js";
import os from "node:os";

const hostname = os.hostname();
console.log(`Worker starting on ${hostname}`);

await Promise.all([
  connect({
    apps: [{ client: heavyClient, functions: [heavyFn] }],
    maxWorkerConcurrency: 2,
    instanceId: `${hostname}-heavy`,
    gatewayUrl: "ws://inngest:8289/v0/connect",
    isolateExecution: false,
  }),
  connect({
    apps: [{ client: lightClient, functions: [lightFn] }],
    instanceId: `${hostname}-light`,
    gatewayUrl: "ws://inngest:8289/v0/connect",
    isolateExecution: false,
  }),
]);
