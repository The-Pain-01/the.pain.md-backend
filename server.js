
import express from "express";
import helmet from "helmet";

import config from "./config.js";
import sessionRoutes from "./routes/session.routes.js";

import {
  rejectCrossSiteWrites
} from "./middleware/security.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

// --------------------------------------------------
// SECURITY HEADERS
// --------------------------------------------------

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// --------------------------------------------------
// CORS
// --------------------------------------------------

const allowedOrigins = new Set(
  [
    config.FRONTEND_URL,
    ...(config.FRONTEND_URLS || [])
  ]
    .filter(Boolean)
    .map(origin => String(origin).replace(/\/$/, ""))
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const normalizedOrigin = origin
    ? String(origin).replace(/\/$/, "")
    : null;

  if (normalizedOrigin && allowedOrigins.has(normalizedOrigin)) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      normalizedOrigin
    );

    res.setHeader(
      "Access-Control-Allow-Credentials",
      "true"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    if (
      normalizedOrigin &&
      !allowedOrigins.has(normalizedOrigin)
    ) {
      return res.status(403).json({
        code: "ORIGIN_NOT_ALLOWED",
        message: "This origin is not allowed."
      });
    }

    return res.sendStatus(204);
  }

  next();
});

// --------------------------------------------------
// BODY PARSER
// --------------------------------------------------

app.use(
  express.json({
    limit: "32kb"
  })
);

// --------------------------------------------------
// CROSS-SITE PROTECTION
// --------------------------------------------------

app.use(rejectCrossSiteWrites);

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "THE PAIN MD API",
    version: config.VERSION
  });
});

// --------------------------------------------------
// SESSION API
// --------------------------------------------------

app.use(
  "/api/v1/sessions",
  sessionRoutes
);

// --------------------------------------------------
// 404
// --------------------------------------------------

app.use((_req, res) => {
  res.status(404).json({
    code: "NOT_FOUND",
    message: "Route not found."
  });
});

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use((error, _req, res, _next) => {
  const status = Number(error.status) || 500;

  if (status >= 500) {
    console.error("[API ERROR]", error);
  }

  res.status(status).json({
    code: error.code || "INTERNAL_ERROR",
    message:
      status >= 500
        ? "The server could not complete the request."
        : error.message
  });
});

export default app;
