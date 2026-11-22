-- Repara acentos corruptos en el catalogo de Supabase (Marr + o -> Marron).
-- Causa: el schema.sql se copio al portapapeles con codificacion ANSI de Windows
-- y los bytes UTF-8 se interpretaron como Windows-1252 al pegarlos en el SQL Editor.
--
--Este archivo es ASCII-only a proposito: no depende de como se copie/pegue.
-- Ejecutarlo una sola vez en el SQL Editor del proyecto.

create or replace function public._nys_fix_mojibake(value text)
returns text
language sql
immutable
as $$
  select case
    when value is null or position(chr(195) in value) = 0 then value
    else convert_from(convert_to(value, 'WIN1252'), 'UTF8')
  end;
$$;

update public.products p
set
  name = public._nys_fix_mojibake(p.name),
  description = public._nys_fix_mojibake(p.description),
  color = public._nys_fix_mojibake(p.color),
  category = public._nys_fix_mojibake(p.category),
  sizes = (
    select array_agg(public._nys_fix_mojibake(s) order by n)
    from unnest(p.sizes) with ordinality as t(s, n)
  )
where
  position(chr(195) in p.name) > 0
  or position(chr(195) in p.description) > 0
  or position(chr(195) in p.color) > 0
  or position(chr(195) in p.category) > 0
  or exists (
    select 1 from unnest(p.sizes) s where position(chr(195) in s) > 0
  );

drop function public._nys_fix_mojibake(text);

-- Verificacion: no debe devolver ninguna fila.
select id, name, color, sizes
from public.products
where position(chr(195) in name) > 0
   or position(chr(195) in description) > 0
   or position(chr(195) in color) > 0
   or position(chr(195) in category) > 0
   or exists (select 1 from unnest(sizes) s where position(chr(195) in s) > 0);
