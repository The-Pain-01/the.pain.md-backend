export function rejectCrossSiteWrites(req, res, next) {

  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {

    const fetchSite = req.get("sec-fetch-site");

    if (fetchSite === "cross-site") {

      return res.status(403).json({
        code: "CROSS_SITE_REQUEST",
        message: "Cross-site requests are not allowed."
      });

    }

  }

  next();

}
