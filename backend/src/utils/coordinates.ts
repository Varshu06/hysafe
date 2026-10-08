export type LatLng = { lat: number; lng: number };

export const parseCoordinates = (value: unknown): LatLng | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as { lat?: unknown; lng?: unknown; latitude?: unknown; longitude?: unknown };
  const lat = Number(record.lat ?? record.latitude);
  const lng = Number(record.lng ?? record.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};
