export type LatLng = { lat: number; lng: number };

export type ServiceArea = {
  center: LatLng | null;
  radiusKm: number | null;
};

export type DeliveryAreaDecision =
  | { ok: true; location?: LatLng }
  | { ok: false; status: 400 | 500; message: string };

const EARTH_RADIUS_KM = 6371;
const BOUNDARY_TOLERANCE_KM = 1e-6;

function usableAxis(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isSelectable(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0);
}

export function parseDeliveryCoordinates(value: unknown): LatLng | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as { lat?: unknown; lng?: unknown; latitude?: unknown; longitude?: unknown };
  const lat = usableAxis(record.lat ?? record.latitude);
  const lng = usableAxis(record.lng ?? record.longitude);
  if (lat == null || lng == null || !isSelectable(lat, lng)) return null;
  return { lat, lng };
}

export function haversineKm(origin: LatLng, destination: LatLng): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRad(origin.lat);
  const lat2 = toRad(destination.lat);
  const dLat = lat2 - lat1;
  const dLng = toRad(destination.lng - origin.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function envNumber(value: string | undefined): number | null {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Reads the server's own service center. Missing values stay missing. */
export function serviceAreaFromEnv(env: Record<string, string | undefined>): ServiceArea {
  const lat = envNumber(env.FACTORY_LAT);
  const lng = envNumber(env.FACTORY_LNG);
  const center = lat != null && lng != null && isSelectable(lat, lng) ? { lat, lng } : null;
  const configuredRadius = env.SERVICE_RADIUS_KM;
  if (configuredRadius == null || configuredRadius.trim() === '') {
    return { center, radiusKm: 5 };
  }
  const radiusKm = envNumber(configuredRadius);
  return { center, radiusKm: radiusKm != null && radiusKm > 0 ? radiusKm : null };
}

export function assessDeliveryLocation(location: unknown, area: ServiceArea): DeliveryAreaDecision {
  if (location == null) return { ok: true };
  const point = parseDeliveryCoordinates(location);
  if (!point) {
    return { ok: false, status: 400, message: 'Delivery coordinates are invalid.' };
  }
  if (!area.center || area.radiusKm == null) {
    return { ok: false, status: 500, message: 'Delivery area is not configured.' };
  }
  const distanceKm = haversineKm(area.center, point);
  if (distanceKm <= area.radiusKm + BOUNDARY_TOLERANCE_KM) {
    return { ok: true, location: point };
  }
  return {
    ok: false,
    status: 400,
    message: `Delivery location is outside the ${area.radiusKm} km service area.`,
  };
}
