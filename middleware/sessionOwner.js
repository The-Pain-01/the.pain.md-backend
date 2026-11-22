import {
  hashToken
} from "../utils/encryption.js";


function readCookies(header = "") {

  const result = {};

  for (const part of header.split(";")) {

    const index = part.indexOf("=");

    if (index < 0) continue;

    const key = part.slice(0, index).trim();

    const value = part.slice(index + 1).trim();

    try {
      result[key] = decodeURIComponent(value);
    } catch {}

  }

  return result;
}


export function getOwnerToken(req) {

  const name =
    process.env.COOKIE_NAME || "pain_session";

  return readCookies(
    req.headers.cookie || ""
  )[name] || null;

}


export function getOwnerHash(req) {

  const token = getOwnerToken(req);

  return token
    ? hashToken(token)
    : null;

}


export function requireSessionOwner(req, res, next) {

  const ownerHash = getOwnerHash(req);

  if (!ownerHash) {

    return res.status(401).json({
      code: "SESSION_OWNER_REQUIRED",

      message:
        "No browser session found. Start a new WhatsApp session."
    });

  }

  req.ownerHash = ownerHash;

  next();

}
