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


export function encryptJson(value) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    KEY,
    iv
  );

  const plaintext = Buffer.from(
    JSON.stringify(value)
  );

  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv,
    tag,
    ciphertext
  ]
    .map(part => part.toString("base64url"))
    .join(".");
}


export function decryptJson(payload) {
  const [
    ivText,
    tagText,
    dataText
  ] = String(payload).split(".");

  if (!ivText || !tagText || !dataText) {
    throw new Error(
      "Invalid encrypted auth record."
    );
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    KEY,
    Buffer.from(ivText, "base64url")
  );

  decipher.setAuthTag(
    Buffer.from(tagText, "base64url")
  );

  const plaintext = Buffer.concat([
    decipher.update(
      Buffer.from(dataText, "base64url")
    ),
    decipher.final()
  ]);

  return JSON.parse(
    plaintext.toString("utf8")
  );
}


export function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
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
