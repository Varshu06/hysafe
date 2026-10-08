export type LatLng = { lat: number; lng: number };

export type ClientDeliveryDecision =
  | { kind: 'missing' }
  | { kind: 'invalid' }
  | { kind: 'unconfigured' }
  | { kind: 'inside'; distanceKm: number; point: LatLng }
  | { kind: 'outside'; distanceKm: number };

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

function readPoint(value: unknown): LatLng | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as { lat?: unknown; lng?: unknown };
  const lat = usableAxis(record.lat);
  const lng = usableAxis(record.lng);
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

export function assessClientDeliveryPin(
  location: unknown,
  center: LatLng | null | undefined,
  radiusKm: number,
): ClientDeliveryDecision {
  if (location == null) return { kind: 'missing' };
  const point = readPoint(location);
  if (!point) return { kind: 'invalid' };
  if (!center || !isSelectable(center.lat, center.lng) || !Number.isFinite(radiusKm) || radiusKm <= 0) {
    return { kind: 'unconfigured' };
  }
  const distanceKm = haversineKm(center, point);
  if (distanceKm <= radiusKm + BOUNDARY_TOLERANCE_KM) {
    return { kind: 'inside', distanceKm, point };
  }
  return { kind: 'outside', distanceKm };
}

export function deliveryAreaMessageKey(decision: ClientDeliveryDecision): 'outside' | 'invalid' | 'unconfigured' | null {
  if (decision.kind === 'outside') return 'outside';
  if (decision.kind === 'invalid') return 'invalid';
  if (decision.kind === 'unconfigured') return 'unconfigured';
  return null;
}
