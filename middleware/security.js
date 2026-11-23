function getAllowedOrigins() {
  const values = [
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS || "").split(",")
  ];

  return new Set(
    values
      .filter(Boolean)
      .map(value => {
        try {
          return new URL(value.trim()).origin;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
  );
}

export function rejectCrossSiteWrites(req, res, next) {
  const safeMethods = [
    "GET",
    "HEAD",
    "OPTIONS"
  ];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  const origin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");

  const allowedOrigins = getAllowedOrigins();

  if (origin) {
    let normalizedOrigin;

    try {
      normalizedOrigin = new URL(origin).origin;
    } catch {
      return res.status(403).json({
        code: "INVALID_ORIGIN",
        message: "Invalid request origin."
      });
    }

    if (!allowedOrigins.has(normalizedOrigin)) {
      return res.status(403).json({
        code: "CROSS_SITE_REQUEST",
        message: "This origin is not allowed."
      });
    }

    return next();
  }

  if (fetchSite === "cross-site") {
    return res.status(403).json({
      code: "CROSS_SITE_REQUEST",
      message: "Cross-site requests are not allowed."
    });
  }

  next();
}
