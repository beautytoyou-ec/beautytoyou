# Beauty to You · Agenda tu cita

Página para reservar citas del estudio Beauty to You (uñas, cejas y pestañas) en Portoviejo.
Hecha con Next.js, Tailwind y Supabase. Zona horaria: America/Guayaquil.

## Cómo funciona

1. La clienta elige categoría y servicio.
2. Elige con quién (Andrea, Paulina o "Cualquiera"), el día y una hora libre (cada 15 min).
3. Deja su nombre y WhatsApp y confirma.
4. Ve su cita confirmada y puede avisar al estudio por WhatsApp (097 865 3077).

Las horas libres salen del horario de atención, la duración del servicio y la función `ocupados()` de Supabase.
Si dos personas eligen la misma hora a la vez, la base de datos rechaza la segunda y la página le pide elegir otra.

## Configuración

1. Copia `.env.example` como `.env.local` y pon la **Project URL** y la clave **anon public**
   (Supabase → Project Settings → API).
2. `npm install` y `npm run dev`.

En Vercel, agrega las mismas variables en Settings → Environment Variables.

## Base de datos

- `supabase/01_tablas_y_reservas.sql`: tablas, datos iniciales y reglas públicas (ya ejecutado).
- `supabase/02_admin_politicas.sql`: reglas del panel `/admin` y lista de correos con acceso.
- `supabase/03_aviso_correo.sql`: avisa por correo cada cita nueva (cambiar `TU_SECRETO` antes de ejecutar).

## Panel del estudio (`/admin`)

Agenda del día y de la semana, cancelar citas, editar servicios (nombre, duración, precio, visible),
horario de atención y bloqueos (feriados, vacaciones, permisos).

Acceso: crear el usuario en Supabase → Authentication → Users → Add user (correo y contraseña)
y agregar ese correo a la tabla `administradoras`.

## Aviso por correo

Variables en Vercel: `RESEND_API_KEY`, `AVISO_EMAIL` (uno o varios correos separados por coma),
`AVISO_SECRETO` (el mismo texto que en el SQL). Sin dominio propio, Resend solo envía al correo
con el que se creó la cuenta de Resend.

## Personalizar

- **Fotos:** reemplaza los archivos de `public/fotos/` (`portada.jpg`, `unas.jpg`, `rostro.jpg`) por fotos reales del estudio, con el mismo nombre.
- **Textos de categorías:** `src/components/Reserva.tsx`, constante `CATEGORIAS`.
- **WhatsApp e Instagram:** `src/lib/negocio.ts`.
- **Anticipación mínima y días que se muestran:** `src/lib/horarios.ts`.

## Pendiente

- Enlace para que la clienta cambie de día o cancele su cita.
