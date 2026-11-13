import { useEffect, useState } from 'react';

export function useGeo() {
  const [p, setP] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (x) => setP({ lat: x.coords.latitude, lng: x.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  return p;
}
