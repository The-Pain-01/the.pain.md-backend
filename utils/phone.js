export function normalizePhone(value) {
  const phone = String(value || "")
    .replace(/[^0-9]/g, "");

  if (!/^\d{8,15}$/.test(phone)) {
    const error = new Error(
      "Enter a valid phone number with country code, digits only."
    );

    error.status = 400;
    error.code = "INVALID_PHONE";

    throw error;
  }

  return phone;
}
