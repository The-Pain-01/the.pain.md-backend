import "dotenv/config";

import crypto from "node:crypto";

const keyHex =
  process.env.SESSION_ENCRYPTION_KEY || "";

if (!/^[a-fA-F0-9]{64}$/.test(keyHex)) {
  throw new Error(
    "SESSION_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters."
  );
}

const KEY = Buffer.from(keyHex, "hex");

if (KEY.length !== 32) {
  throw new Error(
    "SESSION_ENCRYPTION_KEY must be a valid 32-byte key."
  );
}

export function encryptJson(value) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    KEY,
    iv
  );

  const plaintext = Buffer.from(
    JSON.stringify(value),
    "utf8"
  );

  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(".");
}

export function decryptJson(payload) {
  const parts = String(payload).split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted auth record."
    );
  }

  const [
    ivText,
    tagText,
    dataText
  ] = parts;

  if (!ivText || !tagText || !dataText) {
    throw new Error(
      "Invalid encrypted auth record."
    );
  }

  const iv = Buffer.from(
    ivText,
    "base64url"
  );

  const tag = Buffer.from(
    tagText,
    "base64url"
  );

  const ciphertext = Buffer.from(
    dataText,
    "base64url"
  );

  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error(
      "Invalid encrypted auth record format."
    );
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    KEY,
    iv
  );

  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return JSON.parse(
    plaintext.toString("utf8")
  );
}

export function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
}

export function randomToken() {
  return crypto
    .randomBytes(32)
    .toString("base64url");
}

export function randomId() {
  return crypto.randomUUID();
}
