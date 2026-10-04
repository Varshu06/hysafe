/**
 * Converts a supported Indian mobile-number format to its canonical 10-digit
 * representation. Returns null when the input is not a valid phone number.
 */
export const normalizeIndianMobilePhone = (phone: unknown): string | null => {
  if (typeof phone !== 'string') {
    return null;
  }

  const trimmedPhone = phone.trim();
  if (!/^[\d\s()+-]+$/.test(trimmedPhone)) {
    return null;
  }

  let normalizedPhone = trimmedPhone.replace(/\D/g, '');
  if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
    normalizedPhone = normalizedPhone.slice(2);
  }

  return /^\d{10}$/.test(normalizedPhone) ? normalizedPhone : null;
};
