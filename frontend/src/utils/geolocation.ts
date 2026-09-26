/**
 * Promisified wrapper around the browser Geolocation API.
 * Returns the device's current lat/lng or throws a user-friendly error.
 */
export function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Allow location access to check in."));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error("Location request timed out. Please try again."));
        } else {
          reject(new Error("Unable to get your location. Please try again."));
        }
      },
      { timeout: 10000, maximumAge: 0 }
    );
  });
}
