-- NyS paso 1/2: DDL y RLS. ASCII-only e idempotente.
-- Ejecutar este archivo completo primero con "Run without RLS".
create extension if not exists pgcrypto;

create table if not exists public.order_item_lots (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete set null,
  quantity integer not null check (quantity between 1 and 9999),
  unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  is_opening boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists order_item_lots_order_item_idx on public.order_item_lots (order_item_id);

create index if not exists order_item_lots_purchase_idx on public.order_item_lots (purchase_id);

alter table public.order_item_lots enable row level security;

drop policy if exists "admins read order item lots" on public.order_item_lots;

create policy "admins read order item lots" on public.order_item_lots
  for select to authenticated using (public.is_store_admin());

revoke all on public.order_item_lots from anon, authenticated;

grant select on public.order_item_lots to authenticated;

alter table public.purchases add column if not exists remaining_quantity integer not null default 0;

alter table public.purchases add column if not exists is_opening boolean not null default false;

alter table public.purchases add column if not exists is_legacy boolean not null default true;

alter table public.products enable row level security;

update public.purchases set remaining_quantity = 0 where remaining_quantity is null;

alter table public.purchases alter column remaining_quantity set not null;

update public.purchases set remaining_quantity = 0 where is_legacy and remaining_quantity <> 0;

alter table public.purchases drop constraint if exists purchases_remaining_check;

alter table public.purchases add constraint purchases_remaining_check
  check (remaining_quantity between 0 and quantity);

insert into public.purchases
  (product_id, product_name, quantity, remaining_quantity, unit_cost, supplier, purchased_at, is_opening, is_legacy)
select p.id, p.name, p.stock, p.stock, null, 'Apertura',
       coalesce(p.purchased_at, p.created_at, now()), true, false
from public.products p
where p.stock > 0
  and not exists (
    select 1 from public.purchases o
    where o.is_opening and o.product_id = p.id
  );
