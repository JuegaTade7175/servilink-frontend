# ServiLink Frontend

Frontend web de ServiLink, una plataforma para conectar clientes con profesionales de servicios domesticos en Lima, Peru. La aplicacion permite registrarse, iniciar sesion, buscar profesionales cercanos en un mapa, revisar disponibilidad, crear reservas, gestionar pagos, confirmar citas, enviar mensajes, administrar notificaciones y mantener perfiles de cliente o profesional.

Proyecto desarrollado para el curso CS 2031 Desarrollo Basado en Plataformas, UTEC 2026-1.

## Integrantes

| Nombre | Código |
|---|---|
| Tadeo Joaquín Cárdenas Soto | 202510004 |
| José Enrique Hilario Ruiz Lam | 202510050 |
| Sebastian Falvy Mendoza | 202510469 |
| Joel Rodrigo Eulogio Coquil | 202510112 |
| Miguel Adrian Espinoza Arnero | 202320031 |

---

## Stack tecnico

- React 19
- TypeScript 5.5
- Vite 8
- Tailwind CSS 4
- DaisyUI 5
- Axios
- React Leaflet y Leaflet
- Motion for React
- ESLint 9

## Funcionalidades principales

- Autenticacion con login y registro para clientes y profesionales.
- Persistencia de sesion en `localStorage`.
- Interceptor de Axios para adjuntar el token JWT en cada request.
- Mapa interactivo con profesionales cercanos usando OpenStreetMap.
- Busqueda y filtrado de profesionales por nombre o especialidad.
- Vista publica de disponibilidad por profesional.
- Gestion de reservas con filtros por estado.
- Creacion de nuevas reservas desde el frontend.
- Cambio de estado de reservas.
- Procesamiento de pagos por tarjeta, Yape o transferencia bancaria.
- Generacion y confirmacion de codigos de cita.
- Creacion de resenas para reservas completadas.
- Chat por reserva con polling periodico.
- Panel de notificaciones y conteo de no leidas.
- Perfil de usuario con foto remota mediante URL HTTPS.
- Onboarding para usuarios con rol profesional.
- Dashboard profesional con perfil, reservas recibidas y horarios.

## Requisitos

- Node.js 18 o superior.
- npm 9 o superior.
- Backend de ServiLink ejecutandose en `http://localhost:8081`.

El backend debe exponer los endpoints bajo el prefijo `/api` y debe aceptar autenticacion Bearer con JWT.

## Instalacion y ejecucion

Instala dependencias:

```bash
npm install
```

Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

La aplicacion queda disponible en:

```text
http://localhost:5174
```

Genera una version de produccion:

```bash
npm run build
```

Previsualiza el build local:

```bash
npm run preview
```

## Variables de entorno

El proyecto usa un archivo `.env` en la raiz:

```env
VITE_API_URL=http://localhost:8081
```

Si el backend corre en otro host o puerto, actualiza `VITE_API_URL`.

Vite tambien tiene configurado un proxy para `/api` hacia `http://localhost:8081` en `vite.config.ts`.

## Scripts disponibles

| Script | Descripcion |
| --- | --- |
| `npm run dev` | Inicia Vite en modo desarrollo en el puerto 5174. |
| `npm run build` | Compila TypeScript y genera el build de produccion con Vite. |
| `npm run lint` | Ejecuta ESLint sobre el proyecto. |
| `npm run preview` | Sirve localmente el build generado. |
| `npm run typecheck` | Ejecuta Typecheck sobre el proyecto. |

## Estructura del proyecto

```text
servilink-frontend/
|-- index.html
|-- package.json
|-- vite.config.ts
|-- tsconfig.json
|-- tsconfig.app.json
|-- tsconfig.node.json
|-- src/
|   |-- App.tsx
|   |-- main.tsx
|   |-- index.css
|   |-- api/
|   |   `-- index.ts
|   |-- components/
|   |   `-- ui.tsx
|   |-- context/
|   |   `-- AuthContext.tsx
|   |-- hooks/
|   |   `-- index.ts
|   |-- lib/
|   |   `-- utils.ts
|   |-- pages/
|   |   |-- AvailabilityPage.tsx
|   |   |-- BookingsPage.tsx
|   |   |-- ChatPage.tsx
|   |   |-- ProfessionalDashboardPage.tsx
|   |   `-- ProfessionalOnboardingPage.tsx
|   `-- types/
|       `-- index.ts
`-- mobile/
```

## Arquitectura de la aplicacion

La aplicacion esta centralizada en `App.tsx` y usa un estado interno para cambiar entre vistas principales. No utiliza React Router.

Componentes y modulos principales:

| Modulo | Responsabilidad |
| --- | --- |
| `AuthContext.tsx` | Maneja sesion, datos del usuario y cierre de sesion. |
| `api/index.ts` | Centraliza Axios, interceptores y metodos para consumir el backend. |
| `types/index.ts` | Define los contratos TypeScript del dominio. |
| `hooks/index.ts` | Expone hooks reutilizables para reservas, mensajes, notificaciones y profesionales. |
| `App.tsx` | Contiene autenticacion, layout principal, navegacion y vistas de mapa, profesionales, perfil y notificaciones. |
| `BookingsPage.tsx` | Gestiona reservas, pagos, confirmaciones y resenas. |
| `ChatPage.tsx` | Implementa mensajeria por reserva con polling. |
| `AvailabilityPage.tsx` | Muestra horarios publicos y permite a profesionales gestionar disponibilidad. |
| `ProfessionalDashboardPage.tsx` | Agrupa perfil profesional, reservas recibidas y horarios. |
| `ProfessionalOnboardingPage.tsx` | Crea el perfil inicial para usuarios profesionales. |

## Integracion con el backend

La instancia de Axios se configura con:

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8081',
});
```

El token JWT se guarda en `localStorage` con la clave `sl_token`. En cada request se agrega:

```ts
Authorization: Bearer <token>
```

Si el backend responde `401`, el frontend limpia las claves de sesion y recarga la aplicacion.

Claves usadas en `localStorage`:

| Clave | Valor |
| --- | --- |
| `sl_token` | Token JWT |
| `sl_userId` | ID del usuario |
| `sl_name` | Nombre del usuario |
| `sl_email` | Email del usuario |
| `sl_role` | Rol del usuario |

### Endpoints consumidos

| Modulo | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/login`, `POST /api/auth/register` |
| Usuarios | `GET /api/users/me`, `PATCH /api/users/profile-picture`, `DELETE /api/users/profile-picture` |
| Profesionales | `GET /api/professionals/nearby`, `GET /api/professionals/{id}`, `GET /api/professionals/me`, `POST /api/professionals/profile`, `PUT /api/professionals/profile` |
| Mapa | `GET /api/map/professionals`, `GET /api/map/geocode`, `GET /api/map/distance` |
| Categorias | `GET /api/categories`, `GET /api/categories/{id}`, `GET /api/categories/{id}/services` |
| Reservas | `POST /api/bookings`, `GET /api/bookings/my`, `GET /api/bookings/{id}`, `PATCH /api/bookings/{id}/status`, `GET /api/bookings/professional` |
| Confirmaciones | `POST /api/confirmations/booking/{bookingId}/generate`, `POST /api/confirmations/confirm`, `GET /api/confirmations/booking/{bookingId}`, `DELETE /api/confirmations/booking/{bookingId}` |
| Mensajes | `POST /api/messages/booking/{bookingId}`, `GET /api/messages/booking/{bookingId}`, `PATCH /api/messages/booking/{bookingId}/read`, `GET /api/messages/unread/count` |
| Notificaciones | `GET /api/notifications`, `GET /api/notifications/unread`, `GET /api/notifications/unread/count`, `PATCH /api/notifications/read-all` |
| Pagos | `POST /api/payments`, `GET /api/payments/booking/{bookingId}` |
| Resenas | `POST /api/reviews`, `GET /api/reviews/professional/{professionalId}` |
| Disponibilidad | `GET /api/availability/professional/{id}`, `GET /api/availability/professional/{id}/day`, `POST /api/availability`, `PUT /api/availability/{id}`, `DELETE /api/availability/{id}` |

## Flujos de usuario

### Cliente

1. Se registra o inicia sesion como `CLIENT`.
2. Explora profesionales en el mapa o en la vista de profesionales.
3. Revisa disponibilidad de un profesional.
4. Crea una reserva indicando servicio, fecha, direccion y descripcion.
5. Gestiona pagos, confirmaciones, chat y resenas desde la vista de reservas.

### Profesional

1. Se registra o inicia sesion como `PROFESSIONAL`.
2. Si no tiene perfil profesional, completa el onboarding.
3. Administra especialidad, tarifa, cobertura, certificaciones y ubicacion.
4. Configura horarios disponibles.
5. Revisa reservas recibidas y actualiza su estado.
6. Usa el chat para coordinar con clientes.

## Usuarios de prueba

Estos usuarios dependen de la data inicial del backend:

| Email | Password | Rol |
| --- | --- | --- |
| `carlos@servilink.pe` | `password123` | CLIENT |
| `juan.rios@servilink.pe` | `password123` | PROFESSIONAL |
| `maria.condori@servilink.pe` | `password123` | PROFESSIONAL |

## Solucion de problemas

### El frontend no conecta con el backend

Verifica que el backend este levantado en:

```text
http://localhost:8081
```

Tambien confirma que `.env` tenga:

```env
VITE_API_URL=http://localhost:8081
```

### El mapa no muestra profesionales

Revisa que el backend retorne profesionales con `latitude` y `longitude`. Los marcadores solo se renderizan cuando ambos campos existen.

### La sesion se cierra automaticamente

El frontend limpia la sesion cuando recibe una respuesta `401`. Esto suele indicar token expirado, token invalido o backend reiniciado con otra configuracion de seguridad.

### No aparecen chats

El chat se basa en reservas existentes. Primero debe existir al menos una reserva asociada al usuario autenticado.

### No puedo administrar horarios como profesional

El usuario debe tener rol `PROFESSIONAL` y un perfil profesional creado. Si el perfil no existe, la aplicacion muestra el onboarding.

## Estado del proyecto

Frontend funcional conectado a backend REST. La aplicacion cubre autenticacion, busqueda de profesionales, mapa, reservas, pagos, confirmaciones, mensajeria, notificaciones, disponibilidad y dashboard profesional.
