import * as Location from "expo-location";

function normalizeLocationError(error: unknown): Error {
  const code = typeof error === "object" && error !== null && "code" in error
    ? Number((error as { code: number }).code)
    : 0;
  if (code === 1) return new Error("Location permission was denied.");
  if (code === 2) return new Error("Location is unavailable.");
  if (code === 3) return new Error("Location request timed out.");
  if (error instanceof Error && error.message) return error;
  return new Error("Location is unavailable.");
}

export async function ensureForegroundLocationPermission(): Promise<boolean> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === "denied") return false;
    if (current.status === "granted") return true;
  } catch {
    // Some browsers cannot report permission state. The position request asks once.
    return true;
  }
  try {
    const result = await Location.requestForegroundPermissionsAsync();
    return result.status === "granted";
  } catch {
    return true;
  }
}

export async function getCurrentPositionWithTimeout(): Promise<Location.LocationObject> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000,
      } as Location.LocationOptions).catch((error: unknown) => {
        throw normalizeLocationError(error);
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Location request timed out")), 15000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
