import * as Location from "expo-location";

export async function ensureForegroundLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  const result = current.status === "undetermined"
    ? await Location.requestForegroundPermissionsAsync()
    : current;
  return result.status === "granted";
}

export async function getCurrentPositionWithTimeout(): Promise<Location.LocationObject> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Location request timed out")), 15000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
