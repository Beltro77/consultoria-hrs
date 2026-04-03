# Consultoria Hrs

App móvil para seguimiento de horas y tareas de consultoría. Construida con Next.js 14, TypeScript y Tailwind CSS. Funciona como PWA (se instala en el celu).

## Stack

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Fuente**: DM Sans (Google Fonts)
- **Datos**: localStorage (paso 1) → Supabase (paso 2)

---

## Setup local

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

---

## Deploy en Vercel

1. Subí el proyecto a un repo en GitHub
2. En [vercel.com](https://vercel.com) → **Add New Project** → importá el repo
3. Vercel detecta Next.js automáticamente, no hay configuración extra
4. Click **Deploy**

En ~2 minutos tenés una URL pública.

---

## Instalar en el celu como PWA

**iPhone (Safari)**
1. Abrí la URL de Vercel en Safari
2. Tocá el botón compartir → **"Agregar a pantalla de inicio"**

**Android (Chrome)**
1. Abrí la URL en Chrome
2. Menú → **"Agregar a pantalla de inicio"**

---

## Estructura del proyecto

```
consultoria-hrs/
├── app/
│   ├── layout.tsx          # Root layout, fuente, metadata PWA
│   ├── page.tsx            # Entry point (carga AppShell client-side)
│   └── globals.css
├── components/
│   ├── AppShell.tsx        # Shell principal + bottom nav
│   ├── CalendarView.tsx    # Calendario + panel del día (horas + tareas)
│   ├── DashboardView.tsx   # Dashboard con 3 tabs
│   ├── HistorialView.tsx   # Historial de registros
│   ├── ClientesView.tsx    # Gestión de clientes
│   ├── ui.tsx              # Componentes reutilizables
│   └── modals/
│       ├── EntryModal.tsx  # Modal nueva entrada de horas
│       ├── TaskModal.tsx   # Modal nueva tarea
│       └── ClientModal.tsx # Modal nuevo cliente
├── lib/
│   ├── types.ts            # Tipos, constantes, helpers de fecha
│   └── storage.ts          # Capa de datos (localStorage → Supabase)
└── public/
    └── manifest.json       # PWA manifest
```

---

## Paso 2: Conectar Supabase

Cuando estés listo para sincronizar datos entre dispositivos:

### Schema de Supabase (ejecutar en SQL editor)

```sql
create table clients (
  id           text primary key,
  name         text not null,
  rate         numeric,
  color_index  int  not null default 0,
  user_id      uuid references auth.users(id),
  created_at   timestamptz default now()
);

create table hour_entries (
  id          text primary key,
  client_id   text not null,
  task        text not null,
  detail      text,
  hours       numeric not null,
  date        date not null,
  user_id     uuid references auth.users(id),
  created_at  timestamptz default now()
);

create table tasks (
  id            text primary key,
  title         text not null,
  desc          text,
  date          date not null,
  original_date date not null,
  status        text not null default 'pendiente',
  type          text not null default 'puntual',
  recur_def_id  text,
  user_id       uuid references auth.users(id),
  created_at    timestamptz default now()
);

create table recur_defs (
  id          text primary key,
  title       text not null,
  desc        text,
  type        text not null,
  day         int,
  weekday     int,
  start_date  date not null,
  user_id     uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- Row Level Security
alter table clients     enable row level security;
alter table hour_entries enable row level security;
alter table tasks       enable row level security;
alter table recur_defs  enable row level security;

create policy "own data" on clients      for all using (auth.uid() = user_id);
create policy "own data" on hour_entries for all using (auth.uid() = user_id);
create policy "own data" on tasks        for all using (auth.uid() = user_id);
create policy "own data" on recur_defs   for all using (auth.uid() = user_id);
```

### Variables de entorno

Crear `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Luego instalar el cliente:

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

Reemplazar `lib/storage.ts` con llamadas a Supabase manteniendo las mismas firmas de funciones. El resto de la app no necesita cambios.

---

## Funcionalidades actuales

- **Calendario** como vista principal con indicadores visuales por día
- **Registro de horas** por cliente/área y tipo de actividad
- **Tareas** integradas en el calendario, visualmente diferenciadas
  - Tareas puntuales y recurrentes (inicio/fin de mes, semanal, mensual)
  - Generación automática de recurrentes
  - Tareas pendientes se mueven al siguiente día hábil
  - Estados: pendiente → en ejecución → realizada
- **Dashboard** con 3 tabs: por mes, por cliente, por actividad
- **Historial** filtrable por cliente
- **Clientes** con tarifa/hora y cálculo de facturación
- **PWA**: instalable en el celu
