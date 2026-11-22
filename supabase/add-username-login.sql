-- Login con nombre de usuario para administradores de Supabase.
-- Ejecutar una sola vez en el SQL Editor. ASCII-only a proposito:
-- no depende de como se copie/pegue el archivo.
-- Define el alias "hernan" para hernan.diiaz@gmail.com. Cambialo si queres otro.

alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.resolve_admin_username(p_username text)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select lower(u.email)
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.role = 'admin'
    and p.username is not null
    and lower(btrim(p.username)) = lower(btrim(p_username))
  limit 1;
$$;

revoke all on function public.resolve_admin_username(text) from public;
grant execute on function public.resolve_admin_username(text) to anon, authenticated;

update public.profiles
set username = 'hernan'
where user_id = (select id from auth.users where lower(email) = lower('hernan.diiaz@gmail.com'))
  and role = 'admin';

-- Verificacion: debe devolver role = admin y username = hernan
select u.email, p.role, p.username
from auth.users u
left join public.profiles p on p.user_id = u.id
where lower(u.email) = lower('hernan.diiaz@gmail.com');
