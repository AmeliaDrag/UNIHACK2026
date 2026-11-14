import { useEffect, useState } from 'react';

const ERR = {
  1: 'Accesul la locație este blocat. Apasă pictograma din bara de adrese (lângă URL), alege Setări site, Locație, Permite, apoi reîncarcă pagina.',
  2: 'Locația nu este disponibilă acum. Verifică GPS-ul sau conexiunea.',
  3: 'Obținerea locației durează prea mult. Reîncerc…',
};

/**
 * useGeoStatus - live GPS position (updates while you move) plus any error.
 * pos = { lat, lng, heading, accuracy } or null. heading is degrees 0-360 (or null).
 */
export function useGeoStatus() {
  const [pos, setPos]     = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Acest browser nu suportă localizarea.');
      return undefined;
    }
    const id = navigator.geolocation.watchPosition(
      (x) => {
        setError(null);
        setPos({
          lat: x.coords.latitude,
          lng: x.coords.longitude,
          heading: x.coords.heading,
          accuracy: x.coords.accuracy,   // meters
        });
      },
      (e) => {
        console.error('[geo] error', e.code, e.message);
        setError(ERR[e.code] || 'Eroare de localizare.');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return { pos, error };
}

/** Same as before: just the position (or null). */
export function useGeo() {
  return useGeoStatus().pos;
}