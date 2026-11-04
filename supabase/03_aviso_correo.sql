-- Beauty to You · Aviso por correo de cada cita nueva
-- Cada vez que se crea una cita, Supabase avisa a la página (/api/aviso) y esta envía el correo.
-- Antes de ejecutar: cambia TU_SECRETO por el mismo texto que pusiste en Vercel como AVISO_SECRETO.

create extension if not exists pg_net;

create or replace function avisar_cita()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://beautytoyou.vercel.app/api/aviso',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-aviso-secreto', 'TU_SECRETO'
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end $$;

drop trigger if exists aviso_nueva_cita on citas;
create trigger aviso_nueva_cita
  after insert on citas
  for each row execute function avisar_cita();
