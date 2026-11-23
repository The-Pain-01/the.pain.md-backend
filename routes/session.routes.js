import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  createSession,
  getSession,
  generatePairingCode,
  refreshQr,
  logoutSession,
  getLiveSessionByOwner
} from "../services/sessionManager.js";

import {
  getOwnerHash,
  getOwnerToken,
  requireSessionOwner
} from "../middleware/sessionOwner.js";

import {
  randomId,
  randomToken,
  hashToken
} from "../utils/encryption.js";

import {
  query
} from "../database/pool.js";

const router = Router();

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const pairLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

function getCookieOptions() {
  const secure =
    process.env.COOKIE_SECURE !== "false";

  return {
    httpOnly: true,
    secure,

    // SameSite=None est nécessaire pour Vercel -> Render.
    // En développement local sans HTTPS, on utilise lax.
    sameSite: secure ? "none" : "lax",

    path: "/",
    maxAge: 365 * 24 * 60 * 60 * 1000
  };
}

function setOwnerCookie(res, token) {
  const name =
    process.env.COOKIE_NAME || "pain_session";

  res.cookie(
    name,
    token,
    getCookieOptions()
  );
}

function clearOwnerCookie(res) {
  const name =
    process.env.COOKIE_NAME || "pain_session";

  const options = getCookieOptions();

  delete options.maxAge;

  res.clearCookie(name, options);
}

/*
 * CREATE SESSION
 *
 * POST /api/v1/sessions
 *
 * Body:
 * { "method": "qr" }
 * { "method": "pair" }
 */

router.post(
  "/",
  createLimiter,
  async (req, res, next) => {
    try {
      const method = req.body?.method;

      if (!["qr", "pair"].includes(method)) {
        return res.status(400).json({
          code: "INVALID_METHOD",
          message: "Choose qr or pair."
        });
      }

      let token = getOwnerToken(req);
      let ownerHash = getOwnerHash(req);

      if (ownerHash) {
        const existing =
          getLiveSessionByOwner(ownerHash);

        if (existing) {
          if (existing.method !== method) {
            return res.status(409).json({
              code: "SESSION_ALREADY_EXISTS",

              message:
                "A session already exists. Log it out before changing connection method."
            });
          }

          return res.json(
            await getSession(existing.id)
          );
        }

        const persisted = await query(
          `SELECT id
           FROM bot_sessions
           WHERE owner_token_hash = $1
           LIMIT 1`,
          [ownerHash]
        );

        if (persisted.rowCount > 0) {
          return res.status(503).json({
            code: "SESSION_RESTORING",

            message:
              "Your previous session is being restored. Please retry shortly."
          });
        }
      } else {
        token = randomToken();
        ownerHash = hashToken(token);
      }

      const id = randomId();

      const state = await createSession({
        id,
        ownerHash,
        method
      });

      setOwnerCookie(res, token);

      return res.status(202).json(state);
    } catch (error) {
      next(error);
    }
  }
);

/*
 * CURRENT SESSION
 *
 * GET /api/v1/sessions/current
 */

router.get(
  "/current",
  requireSessionOwner,
  async (req, res, next) => {
    try {
      const live =
        getLiveSessionByOwner(req.ownerHash);

      if (!live) {
        const persisted = await query(
          `SELECT id, status, method, phone
           FROM bot_sessions
           WHERE owner_token_hash = $1
           LIMIT 1`,
          [req.ownerHash]
        );

        if (!persisted.rowCount) {
          return res.json({
            sessionExists: false,
            status: "ended"
          });
        }

        return res.json({
          sessionExists: true,
          status: persisted.rows[0].status,
          method: persisted.rows[0].method,
          phone: persisted.rows[0].phone
        });
      }

      return res.json(
        await getSession(live.id)
      );
    } catch (error) {
      next(error);
    }
  }
);

/*
 * PAIRING CODE
 *
 * POST /api/v1/sessions/current/pairing-code
 *
 * Body:
 * { "phone": "243XXXXXXXXX" }
 */

router.post(
  "/current/pairing-code",
  requireSessionOwner,
  pairLimiter,
  async (req, res, next) => {
    try {
      const live =
        getLiveSessionByOwner(req.ownerHash);

      if (!live) {
        return res.status(404).json({
          code: "SESSION_NOT_FOUND",
          message: "No active session was found."
        });
      }

      const result =
        await generatePairingCode(
          live.id,
          req.body?.phone
        );

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/*
 * REFRESH QR
 *
 * POST /api/v1/sessions/current/qr/refresh
 */

router.post(
  "/current/qr/refresh",
  requireSessionOwner,
  async (req, res, next) => {
    try {
      const live =
        getLiveSessionByOwner(req.ownerHash);

      if (!live) {
        return res.status(404).json({
          code: "SESSION_NOT_FOUND",
          message: "No active session was found."
        });
      }

      return res.json(
        await refreshQr(live.id)
      );
    } catch (error) {
      next(error);
    }
  }
);

/*
 * LOGOUT
 *
 * POST /api/v1/sessions/current/logout
 */

router.post(
  "/current/logout",
  requireSessionOwner,
  async (req, res, next) => {
    try {
      const live =
        getLiveSessionByOwner(req.ownerHash);

      if (live) {
        await logoutSession(live.id);
      } else {
        await query(
          `DELETE FROM bot_sessions
           WHERE owner_token_hash = $1`,
          [req.ownerHash]
        );
      }

      clearOwnerCookie(res);

      return res.json({
        loggedOut: true
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
