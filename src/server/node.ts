import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import app from "./api";
import { taskScheduler } from "./service/task/scheduler";

import "dotenv/config";

// Start task scheduler for video generation
taskScheduler.start();

app.use("/*", serveStatic({ root: "dist" }));
serve({ fetch: app.fetch, port: 9999 });
