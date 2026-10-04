import { Alert, Linking } from "react-native";
import i18n from "../i18n";

export async function openDirectionsToLocation(destination?: { lat?: number; lng?: number } | null): Promise<void> {
  if (!destination || !Number.isFinite(destination.lat) || !Number.isFinite(destination.lng) || Math.abs(destination.lat!) > 90 || Math.abs(destination.lng!) > 180 || (destination.lat === 0 && destination.lng === 0)) {
    Alert.alert(i18n.t("locationUnavailable"), i18n.t("geoCoordinatesUnavailable"));
    return;
  }
  const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.warn("Could not open external directions:", error);
    Alert.alert(i18n.t("navigationUnavailable"), i18n.t("navigationUnavailableDesc"));
  }
}

export function haversineKm(
  a: { lat: number; lng: number } | undefined,
  b: { lat: number; lng: number } | undefined
): number | null {
  if (!a || !b) return null;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export function etaMinutes(distanceKm: number | null, speedKmph = 25): number | null {
  if (distanceKm == null) return null;
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null;
  if (!Number.isFinite(speedKmph) || speedKmph <= 0) return null;
  return Math.max(1, Math.round((distanceKm / speedKmph) * 60));
}







