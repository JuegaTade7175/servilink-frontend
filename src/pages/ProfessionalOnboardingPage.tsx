import { useState } from 'react';
import { motion } from 'motion/react';
import { professionalsApi } from '../api';

function cn(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(' ');
}

function Spinner() {
  return (
    <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-[#6c63ff] animate-spin" />
  );
}

interface Props {
  onCompleted: () => void;
}

export default function ProfessionalOnboardingPage({ onCompleted }: Props) {
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [baseRate, setBaseRate] = useState('');
  const [coverageRadius, setCoverageRadius] = useState('10');
  const [certifications, setCertifications] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [locating, setLocating] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setErr('Geolocalización no disponible'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setLocating(false);
      },
      () => { setErr('No se pudo obtener tu ubicación'); setLocating(false); }
    );
  };

  const submit = async () => {
    if (!specialty.trim()) { setErr('La especialidad es obligatoria'); return; }
    if (!baseRate || Number(baseRate) <= 0) { setErr('Ingresa una tarifa válida'); return; }
    setLoading(true);
    setErr('');
    try {
      await professionalsApi.createProfile({
        specialty: specialty.trim(),
        description: description.trim() || undefined,
        baseRate: Number(baseRate),
        coverageRadiusKm: Number(coverageRadius) || 10,
        certifications: certifications.trim() || undefined,
        latitude: lat ? Number(lat) : undefined,
        longitude: lng ? Number(lng) : undefined,
        address: address.trim() || undefined,
      });
      onCompleted();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al crear perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, #1a1040 0%, #0c0d14 60%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        { }
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛠️</div>
          <h1
            className="text-3xl font-black mb-2"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #6c63ff, #ff6584)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Completa tu perfil
          </h1>
          <p className="text-[#6b6d8a] text-sm">
            Cuéntales a los clientes quién eres y qué haces
          </p>
        </div>

        <div
          className="rounded-2xl border border-[#252640] p-7 space-y-4"
          style={{ background: '#1a1b2e' }}
        >
          { }
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">
              Especialidad *
            </label>
            <input
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              placeholder="Ej: Electricista Certificado, Gasfitero, Pintor..."
              className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors"
            />
          </div>

          { }
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Cuéntale a los clientes tu experiencia, habilidades y lo que te diferencia..."
              className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors resize-none"
            />
          </div>

          { }
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">
                Tarifa base / hr (S/.) *
              </label>
              <input
                type="number"
                min="1"
                step="0.50"
                value={baseRate}
                onChange={e => setBaseRate(e.target.value)}
                placeholder="50.00"
                className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">
                Radio de cobertura (km)
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={coverageRadius}
                onChange={e => setCoverageRadius(e.target.value)}
                className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] outline-none transition-colors"
              />
            </div>
          </div>

          { }
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">
              Certificaciones
            </label>
            <input
              value={certifications}
              onChange={e => setCertifications(e.target.value)}
              placeholder="Ej: Certificado SENATI 2022, Técnico SENCICO..."
              className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors"
            />
          </div>

          { }
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6b6d8a]">
                Ubicación
              </label>
              <button
                onClick={useMyLocation}
                disabled={locating}
                className="text-[10px] font-semibold text-[#6c63ff] hover:text-[#a09bff] transition-colors flex items-center gap-1 disabled:opacity-40"
              >
                {locating ? <Spinner /> : '📍'} Usar mi ubicación
              </button>
            </div>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Dirección (opcional)"
              className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors mb-2"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                value={lat}
                onChange={e => setLat(e.target.value)}
                placeholder="Latitud"
                className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors"
              />
              <input
                type="number"
                step="any"
                value={lng}
                onChange={e => setLng(e.target.value)}
                placeholder="Longitud"
                className="w-full bg-[#13141f] border border-[#252640] focus:border-[#6c63ff]/60 rounded-xl px-4 py-2.5 text-sm text-[#e8e9f3] placeholder-[#6b6d8a] outline-none transition-colors"
              />
            </div>
            {lat && lng && (
              <p className="text-[10px] text-emerald-400 mt-1">
                ✓ Ubicación capturada: {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
              </p>
            )}
          </div>

          {err && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className={cn(
              'w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2',
              loading ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'
            )}
            style={{ background: 'linear-gradient(135deg, #6c63ff, #5b54e8)' }}
          >
            {loading ? <Spinner /> : '🚀 Crear mi perfil profesional'}
          </button>

          <p className="text-center text-xs text-[#6b6d8a]">
            Podrás editar estos datos en cualquier momento desde tu dashboard
          </p>
        </div>
      </motion.div>
    </div>
  );
}
