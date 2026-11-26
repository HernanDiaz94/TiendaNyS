-- NyS paso 1/2: stock por talle, purchases.size, backfill, RLS y grants.
-- ASCII-only e idempotente. Ejecutar completo con "Run without RLS".
-- NyS: stock por talle, costo por talle y publicacion con costo.
-- ASCII-only e idempotente. Ejecutar con "Run without RLS".
-- Los cuerpos usan as E'...' con punto y coma codificado como \073 para que el
-- splitter del SQL Editor no corte las funciones.

create extension if not exists pgcrypto;

-- Un borrador puede tener precio 0; al publicar se exige precio > 0.
alter table public.products drop constraint if exists products_price_check;
alter table public.products add constraint products_price_check check (price >= 0);
alter table public.products alter column is_active set default false;

create table if not exists public.product_sizes (
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null check (char_length(btrim(size)) between 1 and 20),
  stock integer not null default 0 check (stock between 0 and 9999),
  purchased_at timestamptz,
  primary key (product_id, size)
);

create index if not exists product_sizes_product_idx on public.product_sizes (product_id);

alter table public.product_sizes enable row level security;

drop policy if exists "public can read available product sizes" on public.product_sizes;
create policy "public can read available product sizes" on public.product_sizes
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active = true
    )
  );

drop policy if exists "admins manage product sizes" on public.product_sizes;
create policy "admins manage product sizes" on public.product_sizes
  for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

revoke all on public.product_sizes from anon, authenticated;
grant select on public.product_sizes to anon, authenticated;
grant insert, update, delete on public.product_sizes to authenticated;

alter table public.purchases add column if not exists size text not null default (chr(217) || 'nico');
alter table public.purchases drop constraint if exists purchases_size_check;
alter table public.purchases add constraint purchases_size_check
  check (char_length(btrim(size)) between 1 and 20);

-- Backfill: cada producto conserva su stock total en el primer talle conocido
-- y el resto de los talles arrancan en 0. Carga las compras reales para
-- distribuir el stock por talle.
insert into public.product_sizes (product_id, size, stock, purchased_at)
select p.id, coalesce(p.sizes[1], chr(217) || 'nico'), p.stock,
       coalesce(p.purchased_at, p.created_at, now())
from public.products p
where not exists (
  select 1 from public.product_sizes ps where ps.product_id = p.id
);

insert into public.product_sizes (product_id, size, stock, purchased_at)
select p.id, s.size, 0, coalesce(p.purchased_at, p.created_at, now())
from public.products p
cross join unnest(p.sizes) as s(size)
where not exists (
  select 1 from public.product_sizes ps
  where ps.product_id = p.id and ps.size = s.size
);

-- Compras historicas de un solo talle: se etiquetan con ese talle.
update public.purchases pu
set size = coalesce((
  select ps.size from public.product_sizes ps
  where ps.product_id = pu.product_id and ps.stock > 0
  order by ps.stock desc limit 1
), chr(217) || 'nico')
where pu.product_id is not null
  and pu.size = (chr(217) || 'nico')
  and exists (
    select 1 from public.products p
    where p.id = pu.product_id and coalesce(array_length(p.sizes, 1), 0) = 1
  );

-- Los lotes de apertura viejos quedan consumidos y se recrean por talle.
update public.purchases
set remaining_quantity = 0, is_legacy = true
where is_opening and product_id is not null;

insert into public.purchases
  (product_id, product_name, size, quantity, remaining_quantity, unit_cost,
   supplier, purchased_at, is_opening, is_legacy)
select ps.product_id, p.name, ps.size, ps.stock, ps.stock, null, 'Apertura',
       coalesce(ps.purchased_at, p.purchased_at, p.created_at, now()), true, false
from public.product_sizes ps
join public.products p on p.id = ps.product_id
where ps.stock > 0
  and not exists (
    select 1 from public.purchases o
    where o.is_opening and o.product_id = ps.product_id and o.size = ps.size
  );
