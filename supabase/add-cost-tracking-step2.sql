-- NyS paso 2/2: funciones. ASCII-only e idempotente.
-- Los cuerpos usan as E'...' con punto y coma codificado como \073 para que el
-- splitter del SQL Editor no corte las funciones.
-- Ejecutar este archivo completo despues del paso 1, con "Run without RLS".
create or replace function public.register_purchase(
  p_product_id uuid,
  p_quantity integer,
  p_unit_cost numeric,
  p_supplier text,
  p_purchased_at timestamptz
)
returns public.products
language plpgsql
security definer
set search_path = pg_catalog, public
as E'declare
  v_name text := null\073
  v_when timestamptz := coalesce(p_purchased_at, now())\073
begin
  if not public.is_store_admin() then raise exception \'NOT_ADMIN\'\073 end if\073
  if p_quantity is null or p_quantity < 1 or p_quantity > 9999 then
    raise exception \'INVALID_QUANTITY\'\073
  end if\073
  if p_unit_cost is not null and (p_unit_cost < 0 or p_unit_cost > 99999999) then
    raise exception \'INVALID_COST\'\073
  end if\073
  if p_supplier is not null and char_length(btrim(p_supplier)) > 80 then
    raise exception \'INVALID_SUPPLIER\'\073
  end if\073
  if v_when > now() + interval \'1 day\' or v_when < timestamptz \'2000-01-01\' then
    raise exception \'INVALID_DATE\'\073
  end if\073

  select name into v_name from public.products where id = p_product_id for update\073
  if not found then raise exception \'PRODUCT_NOT_FOUND\'\073 end if\073

  insert into public.purchases
    (product_id, product_name, quantity, remaining_quantity, unit_cost, supplier, purchased_at, is_opening, is_legacy)
  values
    (p_product_id, v_name, p_quantity, p_quantity, p_unit_cost,
     coalesce(btrim(p_supplier), \'\'), v_when, false, false)\073

  update public.products set stock = least(9999, stock + p_quantity), purchased_at = case when stock > 0 and purchased_at is not null then least(purchased_at, v_when) else v_when end where id = p_product_id\073

  return (select p from public.products p where p.id = p_product_id)\073
end\073';

revoke all on function public.register_purchase(uuid, integer, numeric, text, timestamptz) from public, anon;

grant execute on function public.register_purchase(uuid, integer, numeric, text, timestamptz) to authenticated;

create or replace function public.place_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as E'declare
  v_order_id uuid := null\073
  v_order_item_id uuid := null\073
  v_item jsonb := null\073
  v_lot_id uuid := null\073
  v_lot_remaining integer := null\073
  v_lot_cost numeric(12,2) := null\073
  v_lot_opening boolean := null\073
  v_product_id uuid := null\073
  v_quantity integer := null\073
  v_left integer := null\073
  v_take integer := null\073
  v_size text := null\073
  v_name text := null\073
  v_price numeric(12,2) := null\073
  v_stock integer := null\073
  v_sizes text[] := null\073
  v_total numeric(12,2) := 0\073
begin
  if p_customer_name is null or char_length(btrim(p_customer_name)) < 2 or char_length(btrim(p_customer_name)) > 100 or p_customer_name ~ \'[<>[:cntrl:]]\' then
    raise exception \'INVALID_CUSTOMER_NAME\'\073
  end if\073
  if p_customer_phone is null or char_length(btrim(p_customer_phone)) < 8 or char_length(btrim(p_customer_phone)) > 30
     or btrim(p_customer_phone) !~ \'^[+0-9 ().-]+$\'
     or char_length(regexp_replace(btrim(p_customer_phone), \'[^0-9]\', \'\', \'g\')) not between 8 and 15 then
    raise exception \'INVALID_PHONE\'\073
  end if\073
  if p_delivery_notes is not null and char_length(p_delivery_notes) > 300 then
    raise exception \'INVALID_NOTES\'\073
  end if\073
  if p_items is null or jsonb_typeof(p_items) <> \'array\' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception \'INVALID_ITEMS\'\073
  end if\073

  insert into public.orders (customer_name, customer_phone, delivery_notes, status, total)
  values (btrim(p_customer_name), btrim(p_customer_phone), coalesce(btrim(p_delivery_notes), \'\'), \'pendiente\', 0)
  returning id into v_order_id\073

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>\'product_id\')::uuid\073
      v_quantity := (v_item->>\'quantity\')::integer\073
    exception when others then
      raise exception \'INVALID_ITEM\'\073
    end\073
    v_size := coalesce(nullif(btrim(v_item->>\'size\'), \'\'), (chr(217) || \'nico\'))\073
    if v_quantity is null or v_quantity < 1 or v_quantity > 10 or char_length(v_size) > 20 then
      raise exception \'INVALID_ITEM\'\073
    end if\073

    select p.name, p.price, p.stock, p.sizes into v_name, v_price, v_stock, v_sizes
      from public.products p where p.id = v_product_id and p.is_active = true for update\073
    if not found then raise exception \'ITEM_UNAVAILABLE\'\073 end if\073
    if coalesce(array_length(v_sizes, 1), 0) = 0 then
      if v_size <> (chr(217) || \'nico\') then raise exception \'INVALID_SIZE\'\073 end if\073
    elsif not (v_size = any(v_sizes)) then
      raise exception \'INVALID_SIZE\'\073
    end if\073
    if v_stock < v_quantity then raise exception \'STOCK_CHANGED\'\073 end if\073

    insert into public.order_items (order_id, product_id, product_name, size, quantity, unit_price)
      values (v_order_id, v_product_id, v_name, v_size, v_quantity, v_price)
      returning id into v_order_item_id\073

    v_left := v_quantity\073
    for v_lot_id, v_lot_remaining, v_lot_cost, v_lot_opening in
      select id, remaining_quantity, unit_cost, is_opening
      from public.purchases
      where product_id = v_product_id and remaining_quantity > 0
      order by is_opening desc, purchased_at asc, created_at asc, id asc
      for update
    loop
      exit when v_left < 1\073
      v_take := least(v_left, v_lot_remaining)\073
      insert into public.order_item_lots (order_item_id, purchase_id, quantity, unit_cost, is_opening)
        values (v_order_item_id, v_lot_id, v_take, v_lot_cost, v_lot_opening)\073
      update public.purchases set remaining_quantity = remaining_quantity - v_take where id = v_lot_id\073
      v_left := v_left - v_take\073
    end loop\073

    if v_left > 0 then
      insert into public.order_item_lots (order_item_id, purchase_id, quantity, unit_cost, is_opening)
        values (v_order_item_id, null, v_left, null, true)\073
    end if\073

    update public.products set stock = stock - v_quantity where id = v_product_id\073
    v_total := v_total + (v_price * v_quantity)\073
  end loop\073

  update public.orders set total = v_total where id = v_order_id\073
  return jsonb_build_object(\'order_id\', v_order_id, \'total\', v_total)\073
end\073';

revoke all on function public.place_order(text, text, text, jsonb) from public, authenticated;

grant execute on function public.place_order(text, text, text, jsonb) to anon, authenticated;

create or replace function public.admin_update_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as E'declare
  v_current_status text := null\073
  v_lot_purchase_id uuid := null\073
  v_lot_quantity integer := null\073
begin
  if not public.is_store_admin() then raise exception \'NOT_ADMIN\'\073 end if\073
  if p_status not in (\'pendiente\', \'confirmado\', \'preparando\', \'listo\', \'entregado\', \'cancelado\') then
    raise exception \'INVALID_STATUS\'\073
  end if\073
  select status into v_current_status from public.orders where id = p_order_id for update\073
  if not found then raise exception \'ORDER_NOT_FOUND\'\073 end if\073
  if v_current_status in (\'entregado\', \'cancelado\') then raise exception \'ORDER_FINALIZED\'\073 end if\073

  if p_status = \'cancelado\' then
    update public.products p set stock = least(9999, p.stock + reserved.quantity) from (select oi.product_id, sum(oi.quantity)::integer as quantity from public.order_items oi where oi.order_id = p_order_id and oi.product_id is not null group by oi.product_id) reserved where reserved.product_id = p.id\073

    for v_lot_purchase_id, v_lot_quantity in
      select oil.purchase_id, oil.quantity
      from public.order_item_lots oil
      join public.order_items oi on oi.id = oil.order_item_id
      where oi.order_id = p_order_id and oil.purchase_id is not null
      for update
    loop
      update public.purchases set remaining_quantity = least(quantity, remaining_quantity + v_lot_quantity) where id = v_lot_purchase_id\073
    end loop\073
  end if\073
  update public.orders set status = p_status where id = p_order_id\073
end\073';

revoke all on function public.admin_update_order_status(uuid, text) from public, anon;

grant execute on function public.admin_update_order_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Stock por talle, costo por talle y publicacion con costo (version final).
-- Copia sincronizada de supabase/add-size-cost-gate.sql.
-- ---------------------------------------------------------------------------
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

create or replace function public.sync_product_stock_from_sizes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as E'declare
  v_product_id uuid := coalesce(NEW.product_id, OLD.product_id)\073
  v_total integer := 0\073
  v_oldest timestamptz := null\073
begin
  select coalesce(sum(stock), 0)::integer into v_total
    from public.product_sizes where product_id = v_product_id\073
  select min(purchased_at) into v_oldest
    from public.product_sizes where product_id = v_product_id and stock > 0\073
  update public.products
     set stock = least(9999, v_total),
         purchased_at = coalesce(v_oldest, purchased_at, now())
   where id = v_product_id\073
  return null\073
end\073';

drop trigger if exists products_sync_stock_from_sizes on public.product_sizes;
create trigger products_sync_stock_from_sizes
after insert or update or delete on public.product_sizes
for each row execute function public.sync_product_stock_from_sizes();

create or replace function public.validate_product_publication()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as E'declare
  v_missing_cost integer := 0\073
  v_with_stock integer := 0\073
begin
  if TG_OP = \'INSERT\' then
    if coalesce(NEW.is_active, false) then
      if NEW.price is null or NEW.price <= 0 then
        raise exception \'PUBLISH_REQUIRES_PRICE\'\073
      end if\073
      select count(*) into v_with_stock from public.product_sizes
        where product_id = NEW.id and stock > 0\073
      if v_with_stock < 1 then raise exception \'PUBLISH_REQUIRES_STOCK\'\073 end if\073
      select count(*) into v_missing_cost from public.product_sizes ps
        where ps.product_id = NEW.id and ps.stock > 0
          and not exists (
            select 1 from public.purchases pu
            where pu.product_id = NEW.id and pu.size = ps.size
              and pu.is_opening = false and pu.unit_cost is not null
              and pu.remaining_quantity > 0
          )\073
      if v_missing_cost > 0 then raise exception \'PUBLISH_REQUIRES_COST\'\073 end if\073
    end if\073
    return NEW\073
  end if\073

  if coalesce(OLD.is_active, false) = false and coalesce(NEW.is_active, false) = true then
    if NEW.price is null or NEW.price <= 0 then
      raise exception \'PUBLISH_REQUIRES_PRICE\'\073
    end if\073
    select count(*) into v_with_stock from public.product_sizes
      where product_id = NEW.id and stock > 0\073
    if v_with_stock < 1 then raise exception \'PUBLISH_REQUIRES_STOCK\'\073 end if\073
    select count(*) into v_missing_cost from public.product_sizes ps
      where ps.product_id = NEW.id and ps.stock > 0
        and not exists (
          select 1 from public.purchases pu
          where pu.product_id = NEW.id and pu.size = ps.size
            and pu.is_opening = false and pu.unit_cost is not null
            and pu.remaining_quantity > 0
        )\073
    if v_missing_cost > 0 then raise exception \'PUBLISH_REQUIRES_COST\'\073 end if\073
  end if\073
  return NEW\073
end\073';

drop trigger if exists products_publication_gate on public.products;
create trigger products_publication_gate
before insert or update of is_active, price on public.products
for each row execute function public.validate_product_publication();

create or replace function public.register_purchase(
  p_product_id uuid,
  p_size text,
  p_quantity integer,
  p_unit_cost numeric,
  p_supplier text,
  p_purchased_at timestamptz
)
returns public.products
language plpgsql
security definer
set search_path = pg_catalog, public
as E'declare
  v_name text := null\073
  v_size text := null\073
  v_sizes text[] := null\073
  v_when timestamptz := coalesce(p_purchased_at, now())\073
begin
  if not public.is_store_admin() then raise exception \'NOT_ADMIN\'\073 end if\073
  if p_size is null or char_length(btrim(p_size)) < 1 or char_length(btrim(p_size)) > 20 then
    raise exception \'INVALID_SIZE\'\073
  end if\073
  v_size := btrim(p_size)\073
  if p_quantity is null or p_quantity < 1 or p_quantity > 9999 then
    raise exception \'INVALID_QUANTITY\'\073
  end if\073
  if p_unit_cost is null or p_unit_cost < 0 or p_unit_cost > 99999999 then
    raise exception \'INVALID_COST\'\073
  end if\073
  if p_supplier is not null and char_length(btrim(p_supplier)) > 80 then
    raise exception \'INVALID_SUPPLIER\'\073
  end if\073
  if v_when > now() + interval \'1 day\' or v_when < timestamptz \'2000-01-01\' then
    raise exception \'INVALID_DATE\'\073
  end if\073

  select name, sizes into v_name, v_sizes
    from public.products where id = p_product_id for update\073
  if not found then raise exception \'PRODUCT_NOT_FOUND\'\073 end if\073
  if coalesce(array_length(v_sizes, 1), 0) = 0 then
    if v_size <> (chr(217) || \'nico\') then raise exception \'INVALID_SIZE\'\073 end if\073
  elsif not (v_size = any(v_sizes)) then
    raise exception \'INVALID_SIZE\'\073
  end if\073

  insert into public.product_sizes (product_id, size, stock, purchased_at)
  values (p_product_id, v_size, 0, null)
  on conflict (product_id, size) do nothing\073

  insert into public.purchases
    (product_id, product_name, size, quantity, remaining_quantity, unit_cost,
     supplier, purchased_at, is_opening, is_legacy)
  values
    (p_product_id, v_name, v_size, p_quantity, p_quantity, p_unit_cost,
     coalesce(btrim(p_supplier), \'\'), v_when, false, false)\073

  update public.product_sizes
     set stock = least(9999, stock + p_quantity),
         purchased_at = case
           when stock > 0 and purchased_at is not null then least(purchased_at, v_when)
           else v_when
         end
   where product_id = p_product_id and size = v_size\073

  return (select p from public.products p where p.id = p_product_id)\073
end\073';

revoke all on function public.register_purchase(uuid, text, integer, numeric, text, timestamptz) from public, anon;
grant execute on function public.register_purchase(uuid, text, integer, numeric, text, timestamptz) to authenticated;

create or replace function public.place_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as E'declare
  v_order_id uuid := null\073
  v_order_item_id uuid := null\073
  v_item jsonb := null\073
  v_lot_id uuid := null\073
  v_lot_remaining integer := null\073
  v_lot_cost numeric(12,2) := null\073
  v_lot_opening boolean := null\073
  v_product_id uuid := null\073
  v_quantity integer := null\073
  v_left integer := null\073
  v_take integer := null\073
  v_size text := null\073
  v_size_stock integer := null\073
  v_name text := null\073
  v_price numeric(12,2) := null\073
  v_sizes text[] := null\073
  v_total numeric(12,2) := 0\073
begin
  if p_customer_name is null or char_length(btrim(p_customer_name)) < 2 or char_length(btrim(p_customer_name)) > 100 or p_customer_name ~ \'[<>[:cntrl:]]\' then
    raise exception \'INVALID_CUSTOMER_NAME\'\073
  end if\073
  if p_customer_phone is null or char_length(btrim(p_customer_phone)) < 8 or char_length(btrim(p_customer_phone)) > 30
     or btrim(p_customer_phone) !~ \'^[+0-9 ().-]+$\'
     or char_length(regexp_replace(btrim(p_customer_phone), \'[^0-9]\', \'\', \'g\')) not between 8 and 15 then
    raise exception \'INVALID_PHONE\'\073
  end if\073
  if p_delivery_notes is not null and char_length(p_delivery_notes) > 300 then
    raise exception \'INVALID_NOTES\'\073
  end if\073
  if p_items is null or jsonb_typeof(p_items) <> \'array\' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception \'INVALID_ITEMS\'\073
  end if\073

  insert into public.orders (customer_name, customer_phone, delivery_notes, status, total)
  values (btrim(p_customer_name), btrim(p_customer_phone), coalesce(btrim(p_delivery_notes), \'\'), \'pendiente\', 0)
  returning id into v_order_id\073

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>\'product_id\')::uuid\073
      v_quantity := (v_item->>\'quantity\')::integer\073
    exception when others then
      raise exception \'INVALID_ITEM\'\073
    end\073
    v_size := coalesce(nullif(btrim(v_item->>\'size\'), \'\'), (chr(217) || \'nico\'))\073
    if v_quantity is null or v_quantity < 1 or v_quantity > 10 or char_length(v_size) > 20 then
      raise exception \'INVALID_ITEM\'\073
    end if\073

    select p.name, p.price, p.sizes into v_name, v_price, v_sizes
      from public.products p where p.id = v_product_id and p.is_active = true for update\073
    if not found then raise exception \'ITEM_UNAVAILABLE\'\073 end if\073
    if coalesce(array_length(v_sizes, 1), 0) = 0 then
      if v_size <> (chr(217) || \'nico\') then raise exception \'INVALID_SIZE\'\073 end if\073
    elsif not (v_size = any(v_sizes)) then
      raise exception \'INVALID_SIZE\'\073
    end if\073

    select stock into v_size_stock from public.product_sizes
      where product_id = v_product_id and size = v_size for update\073
    if not found then raise exception \'INVALID_SIZE\'\073 end if\073
    if v_size_stock < v_quantity then raise exception \'STOCK_CHANGED\'\073 end if\073

    insert into public.order_items (order_id, product_id, product_name, size, quantity, unit_price)
      values (v_order_id, v_product_id, v_name, v_size, v_quantity, v_price)
      returning id into v_order_item_id\073

    v_left := v_quantity\073
    for v_lot_id, v_lot_remaining, v_lot_cost, v_lot_opening in
      select id, remaining_quantity, unit_cost, is_opening
      from public.purchases
      where product_id = v_product_id and size = v_size and remaining_quantity > 0
      order by is_opening desc, purchased_at asc, created_at asc, id asc
      for update
    loop
      exit when v_left < 1\073
      v_take := least(v_left, v_lot_remaining)\073
      insert into public.order_item_lots (order_item_id, purchase_id, quantity, unit_cost, is_opening)
        values (v_order_item_id, v_lot_id, v_take, v_lot_cost, v_lot_opening)\073
      update public.purchases set remaining_quantity = remaining_quantity - v_take where id = v_lot_id\073
      v_left := v_left - v_take\073
    end loop\073

    if v_left > 0 then
      insert into public.order_item_lots (order_item_id, purchase_id, quantity, unit_cost, is_opening)
        values (v_order_item_id, null, v_left, null, true)\073
    end if\073

    update public.product_sizes set stock = stock - v_quantity
      where product_id = v_product_id and size = v_size\073
    v_total := v_total + (v_price * v_quantity)\073
  end loop\073

  update public.orders set total = v_total where id = v_order_id\073
  return jsonb_build_object(\'order_id\', v_order_id, \'total\', v_total)\073
end\073';

revoke all on function public.place_order(text, text, text, jsonb) from public, authenticated;
grant execute on function public.place_order(text, text, text, jsonb) to anon, authenticated;

create or replace function public.admin_update_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as E'declare
  v_current_status text := null\073
  v_lot_purchase_id uuid := null\073
  v_lot_quantity integer := null\073
  v_product_id uuid := null\073
  v_size text := null\073
  v_quantity integer := null\073
begin
  if not public.is_store_admin() then raise exception \'NOT_ADMIN\'\073 end if\073
  if p_status not in (\'pendiente\', \'confirmado\', \'preparando\', \'listo\', \'entregado\', \'cancelado\') then
    raise exception \'INVALID_STATUS\'\073
  end if\073
  select status into v_current_status from public.orders where id = p_order_id for update\073
  if not found then raise exception \'ORDER_NOT_FOUND\'\073 end if\073
  if v_current_status in (\'entregado\', \'cancelado\') then raise exception \'ORDER_FINALIZED\'\073 end if\073

  if p_status = \'cancelado\' then
    for v_product_id, v_size, v_quantity in
      select oi.product_id, oi.size, sum(oi.quantity)::integer
      from public.order_items oi
      where oi.order_id = p_order_id and oi.product_id is not null
      group by oi.product_id, oi.size
    loop
      insert into public.product_sizes (product_id, size, stock, purchased_at)
        values (v_product_id, v_size, 0, now())
        on conflict (product_id, size) do nothing\073
      update public.product_sizes
         set stock = least(9999, stock + v_quantity)
       where product_id = v_product_id and size = v_size\073
    end loop\073

    for v_lot_purchase_id, v_lot_quantity in
      select oil.purchase_id, oil.quantity
      from public.order_item_lots oil
      join public.order_items oi on oi.id = oil.order_item_id
      where oi.order_id = p_order_id and oil.purchase_id is not null
      for update
    loop
      update public.purchases set remaining_quantity = least(quantity, remaining_quantity + v_lot_quantity) where id = v_lot_purchase_id\073
    end loop\073
  end if\073
  update public.orders set status = p_status where id = p_order_id\073
end\073';

revoke all on function public.admin_update_order_status(uuid, text) from public, anon;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;

-- Convierte el stock de apertura de un talle en un lote con costo, sin sumar
-- unidades. Se usa para regularizar articulos que ya estaban en el catalogo.
create or replace function public.regularize_size_cost(
  p_product_id uuid,
  p_size text,
  p_unit_cost numeric,
  p_supplier text,
  p_purchased_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as E'declare
  v_size text := null\073
  v_when timestamptz := coalesce(p_purchased_at, now())\073
  v_updated integer := 0\073
begin
  if not public.is_store_admin() then raise exception \'NOT_ADMIN\'\073 end if
  if p_size is null or char_length(btrim(p_size)) < 1 or char_length(btrim(p_size)) > 20 then
    raise exception \'INVALID_SIZE\'\073
  end if
  v_size := btrim(p_size)\073
  if p_unit_cost is null or p_unit_cost < 0 or p_unit_cost > 99999999 then
    raise exception \'INVALID_COST\'\073
  end if
  if p_supplier is not null and char_length(btrim(p_supplier)) > 80 then
    raise exception \'INVALID_SUPPLIER\'\073
  end if
  if v_when > now() + interval \'1 day\' or v_when < timestamptz \'2000-01-01\' then
    raise exception \'INVALID_DATE\'\073
  end if

  update public.purchases
     set unit_cost = p_unit_cost,
         is_opening = false,
         is_legacy = false,
         supplier = coalesce(nullif(btrim(p_supplier), \'\'), supplier),
         purchased_at = v_when
   where product_id = p_product_id and size = v_size
     and is_opening = true and remaining_quantity > 0\073
  get diagnostics v_updated = row_count\073
  if v_updated < 1 then raise exception \'NO_OPENING_STOCK\'\073 end if

  update public.product_sizes
     set purchased_at = v_when
   where product_id = p_product_id and size = v_size and stock > 0\073
end\073';

revoke all on function public.regularize_size_cost(uuid, text, numeric, text, timestamptz) from public, anon;
grant execute on function public.regularize_size_cost(uuid, text, numeric, text, timestamptz) to authenticated;