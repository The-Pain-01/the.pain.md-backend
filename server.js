import express from "express";

import helmet from "helmet";

import sessionRoutes from "./routes/session.routes.js";

import {
  rejectCrossSiteWrites
} from "./middleware/security.js";


const app = express();


app.disable("x-powered-by");

app.set("trust proxy", 1);


app.use(
  helmet({

    contentSecurityPolicy: false,

    crossOriginEmbedderPolicy: false

  })
);


app.use(
  express.json({
    limit: "32kb"
  })
);


app.use(rejectCrossSiteWrites);


/*
 * HEALTH CHECK
 */

app.get("/health", (_req, res) => {

  res.json({

    ok: true,

    service: "THE PAIN MD API"

  });

});


/*
 * SESSION API
 */

app.use(
  "/api/v1/sessions",
  sessionRoutes
);


/*
 * 404
 */

app.use((_req, res) => {

  res.status(404).json({

    code: "NOT_FOUND",

    message: "Route not found."

  });

});


/*
 * ERROR HANDLER
 */

app.use((error, _req, res, _next) => {

  const status =
    Number(error.status) || 500;


  if (status >= 500) {

    console.error(
      "[API]",
      error
    );

  }


  res.status(status).json({

    code:
      error.code || "INTERNAL_ERROR",

    message:
      status >= 500
        ? "The server could not complete the request."
        : error.message

  });

});


export default app;
