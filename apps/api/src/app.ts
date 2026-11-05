import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";

const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Lightweight request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} [${res.statusCode}] ${duration}ms`);
  });
  next();
});

// API Routes mounted under /api
app.use("/api", routes);

// Central error handler
app.use(errorHandler);

export { app };
