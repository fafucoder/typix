import "dotenv/config";
import indexHtml from "../../index.html?raw";
import { Hono } from "hono";
import app from "./api";
import { taskScheduler } from "./service/task/scheduler";

// Start task scheduler for video generation
taskScheduler.start();

// Create a new app instance for combined routing
const htmlApp = new Hono();

// Mount the API app at root path
// The API app already has /api basePath
htmlApp.route("/", app);

// Add HTML route for all other requests
htmlApp.get("/*", (c) =>
	c.html(
		indexHtml.replace(
			"</head>",
			`
      <script type="module">
          import RefreshRuntime from "/@react-refresh"
          RefreshRuntime.injectIntoGlobalHook(window)
          window.$RefreshReg$ = () => {}
          window.$RefreshSig$ = () => (type) => type
          window.__vite_plugin_react_preamble_installed__ = true
      </script>
      <script type="module" src="/@vite/client"></script>
    </head>
    `,
		),
	),
);

// Export the combined app
export default htmlApp;




