import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from './api';

export default function TrackPage({ id }) {
  const [s, setS] = useState(undefined);

  useEffect(() => {
    const unsub = api.watchShare(id, (data) => setS(data));
    return unsub;
  }, [id]);

  if (s === undefined) return <p className="c">Se încarcă…</p>;
  if (!s)              return <p className="c">Linkul nu mai este valid.</p>;

  const live = s.active && Date.now() < s.endsAt;
  return (
    <div className="track">
      <div className="p">
        <h2>{live ? 'Traseu în desfășurare' : 'Partajare încheiată'}</h2>
        <p>Destinația: {s.dest || 'nespecificată'}</p>
      </div>
      {s.pos && (
        <MapContainer center={[s.pos.lat, s.pos.lng]} zoom={15} style={{ height: '60vh' }}>
          <TileLayer attribution="© OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <CircleMarker center={[s.pos.lat, s.pos.lng]} radius={10} pathOptions={{ color: '#3b3f9e' }} />
        </MapContainer>
      )}
    </div>
  );
}
