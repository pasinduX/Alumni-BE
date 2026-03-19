import app, { startServer } from "./app";
import { startBidScheduler } from "./cron/bidScheduler";

startServer();
startBidScheduler();

export default app;
