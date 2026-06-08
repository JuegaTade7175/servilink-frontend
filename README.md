# ServiLink Frontend — React + TypeScript

**CS 2031 Desarrollo Basado en Plataformas — UTEC 2026-1**

Frontend React + TypeScript conectado al backend Spring Boot de ServiLink.

---

## Stack

- **React 19** + **TypeScript 5.5**
- **Vite 5** como bundler
- **Axios** para llamadas HTTP al backend (alternativa a fetch nativo)
- **CSS-in-JS** (inline styles) para estilos — sin dependencias de UI externas
- Fuentes: **Syne** (display) + **DM Sans** (cuerpo) via Google Fonts

---

## Estructura

```
src/
├── types/index.ts        # Interfaces TypeScript (espejo del backend)
├── api/index.ts          # Capa de API con axios — todos los endpoints
├── context/
│   └── AuthContext.tsx   # Contexto global de autenticación + localStorage
├── hooks/index.ts        # Custom hooks: useBookings, useMessages, useNotifications
└── App.tsx               # App completa con todas las vistas
```

---

## Vistas implementadas

| Vista | Ruta nav | Descripción |
|-------|----------|-------------|
| **Auth** | — | Login / Registro con tabs |
| **Mapa** | 🗺️ Mapa | Mapa simulado con pins de profesionales |
| **Profesionales** | 👥 | Grid con búsqueda y cards de profesionales |
| **Reservas** | 📋 | Lista filtrada + detalle + cambio de estado |
| **Chat** | 💬 | Mensajería en tiempo real (polling) |
| **Perfil** | 👤 | Datos del usuario + actualización de foto |
| **Notificaciones** | 🔔 | Panel overlay con badge de no leídas |

---

## Cómo correr

### Prerrequisitos
- Node.js 18+
- Backend ServiLink corriendo en `http://localhost:8081`

### Instalación

```bash
cd servilink-frontend
npm install
npm run dev
```

La app queda en **http://localhost:5174**

### Variables de entorno

El archivo `.env` ya está configurado:
```
VITE_API_URL=http://localhost:8081
```

Si el backend corre en otro puerto, actualiza este archivo.

---

## Conexión con el backend

### Autenticación
El token JWT se guarda en `localStorage` y se inyecta automáticamente en cada request via interceptor de axios:

```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Endpoints conectados

| Módulo | Endpoints |
|--------|-----------|
| Auth | `POST /api/auth/login`, `POST /api/auth/register` |
| Usuarios | `GET /api/users/me`, `PATCH /api/users/profile-picture` |
| Profesionales | `GET /api/professionals/nearby`, `GET /api/professionals/{id}` |
| Mapa | `GET /api/map/professionals` |
| Categorías | `GET /api/categories` |
| Reservas | `GET /api/bookings/my`, `POST /api/bookings`, `PATCH /api/bookings/{id}/status` |
| Mensajes | `GET /api/messages/booking/{id}`, `POST /api/messages/booking/{id}` |
| Notificaciones | `GET /api/notifications`, `PATCH /api/notifications/read-all` |
| Reviews | `GET /api/reviews/professional/{id}` |

---

## Usuarios de prueba (del DataInitializer)

| Email | Password | Rol |
|-------|----------|-----|
| `carlos@servilink.pe` | `password123` | CLIENT |
| `juan.rios@servilink.pe` | `password123` | PROFESSIONAL |
| `maria.condori@servilink.pe` | `password123` | PROFESSIONAL |

---

## Arquitectura de componentes

```
App
├── AuthPage          ← login + register tabs
├── Topbar            ← nav + notifications badge
├── MapView           ← mapa simulado + lista lateral de profesionales
├── ProfessionalsView ← grid de profesionales con búsqueda
├── BookingsView      ← lista filtrada + detail panel
├── ChatView          ← conversaciones + mensajería
├── ProfileView       ← datos de usuario + foto
└── NotificationsPanel ← overlay con panel de notifs
```

---

## Para agregar Leaflet real (opcional)

```bash
npm install leaflet react-leaflet @types/leaflet
```

Luego en `MapView`, reemplaza el SVG simulado por:

```tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

<MapContainer center={[-12.0464, -77.0428]} zoom={13} style={{ height: '100%' }}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  {geoPoints.map(p => (
    <Marker key={p.professionalId} position={[p.latitude, p.longitude]}>
      <Popup>{p.name} — {p.specialty}</Popup>
    </Marker>
  ))}
</MapContainer>
```

---

*ServiLink Frontend · CS 2031 DBP 2026-1 · UTEC*
