-- Beauty to You · Base de datos (ya ejecutado en Supabase el 4 nov 2026)
-- Se guarda aquí como respaldo, por si hay que crear el proyecto de nuevo.

create table profesionales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activa boolean default true
);

create table servicios (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  nombre text not null,
  duracion_min int not null,
  precio numeric(6,2),
  activo boolean default true
);

create table horarios (
  dia_semana int primary key, -- 0 domingo ... 6 sábado
  abre time,
  cierra time,
  cerrado boolean default false
);

create table bloqueos (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid references profesionales(id),
  inicio timestamptz not null,
  fin timestamptz not null,
  motivo text
);

create table citas (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid references servicios(id) not null,
  profesional_id uuid references profesionales(id) not null,
  cliente_nombre text not null,
  cliente_telefono text not null,
  inicio timestamptz not null,
  fin timestamptz not null,
  estado text default 'confirmada',
  creada timestamptz default now()
);

alter table profesionales enable row level security;
alter table servicios enable row level security;
alter table horarios enable row level security;
alter table bloqueos enable row level security;
alter table citas enable row level security;

insert into profesionales (nombre) values ('Andrea'), ('Paulina');

insert into servicios (categoria, nombre, duracion_min) values
('Uñas','Manicura tradicional',45),
('Uñas','Manicura y pedicura tradicional',90),
('Uñas','Semipermanente',60),
('Uñas','Base rubber',75),
('Uñas','Softgel',90),
('Uñas','Polygel',120),
('Uñas','Builder gel',120),
('Uñas','Acrílico',150),
('Cejas','Diseño de cejas',30),
('Pestañas','Lifting de pestañas',60),
('Pestañas','Extensiones de pestañas',120);

insert into horarios values
(0,null,null,true),
(1,'09:00','19:00',false),
(2,'09:00','19:00',false),
(3,'09:00','19:00',false),
(4,'09:00','19:00',false),
(5,'09:00','19:00',false),
(6,'09:00','14:00',false);

-- Lectura pública de servicios, profesionales y horarios
create policy "ver servicios" on servicios for select using (activo);
create policy "ver profesionales" on profesionales for select using (activa);
create policy "ver horarios" on horarios for select using (true);

-- Cualquiera puede crear una cita, pero no ver las de otras
create policy "crear cita" on citas for insert to anon with check (estado = 'confirmada');

-- Evitar dos citas cruzadas con la misma profesional
create extension if not exists btree_gist;
alter table citas add constraint sin_choques
  exclude using gist (profesional_id with =, tstzrange(inicio, fin) with &&)
  where (estado <> 'cancelada');

-- Horas ocupadas de un día, sin datos de clientas
create or replace function ocupados(dia date)
returns table (profesional_id uuid, inicio timestamptz, fin timestamptz)
language sql security definer set search_path = public as $$
  select profesional_id, inicio, fin from citas
  where estado <> 'cancelada'
    and inicio < (dia + 1)::timestamp at time zone 'America/Guayaquil'
    and fin > dia::timestamp at time zone 'America/Guayaquil'
  union all
  select profesional_id, inicio, fin from bloqueos
  where inicio < (dia + 1)::timestamp at time zone 'America/Guayaquil'
    and fin > dia::timestamp at time zone 'America/Guayaquil';
$$;
grant execute on function ocupados(date) to anon;
