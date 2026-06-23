import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { professionalsApi, reviewsApi } from '../api';
import type { Professional, Review } from '../types';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function cn(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(' ');
}

function Avatar({ name, url, size = 'md' }: { name: string; url?: string; size?: 'sm' | 'md' | 'lg' }) {
  const colors = ['bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-amber-500', 'bg-violet-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }[size];
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (url) return <img src={url} alt={name} className={cn('rounded-full object-cover flex-shrink-0', sz)} />;
  return (
    <div className={cn('rounded-full flex items-center justify-center text-white font-bold flex-shrink-0', sz, color)}>
      {initials}
    </div>
  );
}

function Stars({ r }: { r: number }) {
  const rating = Math.max(0, Math.min(5, Math.round(r || 0)));
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(rating)}
      <span className="text-white/20">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export default function MapView() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selected, setSelected] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    professionalsApi.nearby(-12.0464, -77.0428, 20)
      .then(setProfessionals)
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    reviewsApi.byProfessional(selected.id).then(setReviews).catch(() => setReviews([]));
  }, [selected]);

  return (
    <div className="flex h-full">
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a2035]/80 z-[1000] text-[var(--muted)]">
            <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#6c63ff] animate-spin mr-3" />
            Cargando...
          </div>
        )}
        <MapContainer center={[-12.0464, -77.0428]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {professionals.filter(p => p.latitude && p.longitude).map(p => (
            <Marker
              key={p.id}
              position={[p.latitude!, p.longitude!]}
              eventHandlers={{ click: () => setSelected(p) }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{p.userName}</p>
                  <p style={{ color: '#6c63ff' }}>{p.specialty}</p>
                  <p className="text-gray-500 text-xs">S/. {p.baseRate}/hr · ★{(p.averageRating ?? 0).toFixed(1)}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--muted)] z-[1000]">
          📍 Lima, Perú — Radio 20km
        </div>
      </div>

      <div className="w-80 border-l border-[var(--border)] overflow-auto bg-[var(--surface)]">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5">
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm text-[var(--muted)] mb-4">← Volver</button>
              <div className="flex gap-3 items-start mb-4">
                <Avatar name={selected.userName} url={selected.profilePictureUrl} size="lg" />
                <div>
                  <h3 className="font-bold">{selected.userName}</h3>
                  <p className="text-[var(--accent)] text-sm">{selected.specialty}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Stars r={selected.averageRating} />
                    <span className="text-xs text-[var(--muted)]">{(selected.averageRating ?? 0).toFixed(1)} ({selected.totalReviews})</span>
                    {selected.isVerified && <span className="badge badge-success badge-xs">✓</span>}
                  </div>
                </div>
              </div>
              {selected.description && <p className="text-sm text-[var(--muted)] mb-4">{selected.description}</p>}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { l: 'Tarifa', v: `S/. ${selected.baseRate}/hr` },
                  { l: 'Radio', v: `${selected.coverageRadiusKm ?? '?'} km` },
                  { l: 'Distancia', v: selected.distanceKm ? `${selected.distanceKm.toFixed(1)} km` : '—' },
                  { l: 'Teléfono', v: selected.userPhone ?? '—' },
                ].map(({ l, v }) => (
                  <div key={l} className="bg-[var(--card)] rounded-xl p-3">
                    <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">{l}</div>
                    <div className="font-bold text-sm">{v}</div>
                  </div>
                ))}
              </div>
              {selected.services.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-2">Servicios</p>
                  <div className="flex flex-col gap-1.5">
                    {selected.services.map(s => (
                      <div key={s.id} className="bg-[var(--card)] rounded-xl px-3 py-2 flex justify-between">
                        <span className="text-sm">{s.name}</span>
                        {s.referencePrice && <span className="font-bold text-[var(--accent)] text-sm">S/. {s.referencePrice}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {reviews.slice(0, 2).map(r => (
                <div key={r.id} className="bg-[var(--card)] rounded-xl p-3 mb-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold">{r.clientName}</span>
                    <Stars r={r.rating} />
                  </div>
                  {r.comment && <p className="text-xs text-[var(--muted)]">{r.comment}</p>}
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
              <h2 className="font-black text-lg mb-1" style={{ fontFamily: 'var(--font-display)' }}>Profesionales</h2>
              <p className="text-sm text-[var(--muted)] mb-4">{professionals.length} cerca de Lima</p>
              <div className="flex flex-col gap-2">
                {professionals.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="card bg-[var(--card)] border border-[var(--border)] cursor-pointer p-3 hover:border-[#6c63ff]/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.userName} url={p.profilePictureUrl} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{p.userName}</div>
                        <div className="text-xs text-[var(--accent)]">{p.specialty}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-yellow-400">★ {(p.averageRating ?? 0).toFixed(1)}</div>
                        <div className="text-xs text-[var(--muted)]">S/. {p.baseRate}/hr</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
