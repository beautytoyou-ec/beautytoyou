-- Beauty to You · Políticas para el panel /admin
-- Pegar en Supabase > SQL Editor y dar a Run.
--
-- Quién puede entrar al panel: solo los correos que estén en la tabla `administradoras`.
-- Primero crea los usuarios en Authentication > Users > Add user,
-- y luego agrega sus correos abajo (al final de este archivo).

create table if not exists administradoras (
  email text primary key
);
alter table administradoras enable row level security;

-- ¿El usuario conectado es administradora?
create or replace function es_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from administradoras
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function es_admin() to authenticated;

create policy "admin ve su registro" on administradoras
  for select to authenticated using (es_admin());

-- Citas: ver, editar (cancelar) y crear desde el panel
create policy "admin ve citas" on citas for select to authenticated using (es_admin());
create policy "admin edita citas" on citas for update to authenticated using (es_admin()) with check (es_admin());
create policy "admin crea citas" on citas for insert to authenticated with check (es_admin());

-- Servicios: ver todos (también los inactivos) y editarlos
create policy "admin ve servicios" on servicios for select to authenticated using (es_admin());
create policy "admin crea servicios" on servicios for insert to authenticated with check (es_admin());
create policy "admin edita servicios" on servicios for update to authenticated using (es_admin()) with check (es_admin());

-- Profesionales
create policy "admin ve profesionales" on profesionales for select to authenticated using (es_admin());
create policy "admin crea profesionales" on profesionales for insert to authenticated with check (es_admin());
create policy "admin edita profesionales" on profesionales for update to authenticated using (es_admin()) with check (es_admin());

-- Horarios
create policy "admin edita horarios" on horarios for update to authenticated using (es_admin()) with check (es_admin());

-- Bloqueos (vacaciones, feriados, permisos)
create policy "admin ve bloqueos" on bloqueos for select to authenticated using (es_admin());
create policy "admin crea bloqueos" on bloqueos for insert to authenticated with check (es_admin());
create policy "admin borra bloqueos" on bloqueos for delete to authenticated using (es_admin());

-- Agregar aquí los correos de quienes administran (cámbialos):
-- insert into administradoras (email) values ('correo-andrea@ejemplo.com'), ('correo-paulina@ejemplo.com');
