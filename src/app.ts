import express from "express";
import dotenv from "dotenv";
// import pinoHttp from "pino-http";

import subscriptionRoutes from "./routes/subscription.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

dotenv.config();

const app = express();

app.use(express.json());
// app.use(pinoHttp());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/v1/subscriptions", subscriptionRoutes);

app.use(errorMiddleware);

export default app;