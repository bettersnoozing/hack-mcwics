import { register } from "node:module";
import { pathToFileURL } from "node:url";

process.on("uncaughtException", (err) => {
	console.error("Uncaught exception during loader init:", err);
});

process.on("unhandledRejection", (reason) => {
	console.error("Unhandled rejection during loader init:", reason);
});

try {
	register("ts-node/esm", pathToFileURL("./"));
} catch (err) {
	console.error("Failed to register ts-node/esm loader:", err);
	throw err;
}
