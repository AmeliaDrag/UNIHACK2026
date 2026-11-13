import { useEffect, useState } from 'react';

/**
 * useGeo — tracks GPS position AND heading (compass direction).
 * Returns { lat, lng, heading } where heading is degrees from 0-360
 * (null if unavailable). Heading is used by the AI direction suggester.
 */
export function useGeo() {
  const [p, setP] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (x) => setP({
        lat: x.coords.latitude,
        lng: x.coords.longitude,
        heading: x.coords.heading,  // degrees, or null
      }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  return p;
}
