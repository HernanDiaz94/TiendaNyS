-- NyS paso 2/2: funciones, triggers y grants.
-- ASCII-only e idempotente. Ejecutar completo despues del paso 1, con "Run without RLS".
-- Los cuerpos usan as E'...' con \073 (punto y coma) y \047 (comilla simple)
-- para que el splitter del SQL Editor no corte las funciones.
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
  if TG_OP = \047INSERT\047 then
    if coalesce(NEW.is_active, false) then
      if NEW.price is null or NEW.price <= 0 then
        raise exception \047PUBLISH_REQUIRES_PRICE\047\073
      end if\073
      select count(*) into v_with_stock from public.product_sizes
        where product_id = NEW.id and stock > 0\073
      if v_with_stock < 1 then raise exception \047PUBLISH_REQUIRES_STOCK\047\073 end if\073
      select count(*) into v_missing_cost from public.product_sizes ps
        where ps.product_id = NEW.id and ps.stock > 0
          and not exists (
            select 1 from public.purchases pu
            where pu.product_id = NEW.id and pu.size = ps.size
              and pu.is_opening = false and pu.unit_cost is not null
              and pu.remaining_quantity > 0
          )\073
      if v_missing_cost > 0 then raise exception \047PUBLISH_REQUIRES_COST\047\073 end if\073
    end if\073
    return NEW\073
  end if\073

  if coalesce(OLD.is_active, false) = false and coalesce(NEW.is_active, false) = true then
    if NEW.price is null or NEW.price <= 0 then
      raise exception \047PUBLISH_REQUIRES_PRICE\047\073
    end if\073
    select count(*) into v_with_stock from public.product_sizes
      where product_id = NEW.id and stock > 0\073
    if v_with_stock < 1 then raise exception \047PUBLISH_REQUIRES_STOCK\047\073 end if\073
    select count(*) into v_missing_cost from public.product_sizes ps
      where ps.product_id = NEW.id and ps.stock > 0
        and not exists (
          select 1 from public.purchases pu
          where pu.product_id = NEW.id and pu.size = ps.size
            and pu.is_opening = false and pu.unit_cost is not null
            and pu.remaining_quantity > 0
        )\073
    if v_missing_cost > 0 then raise exception \047PUBLISH_REQUIRES_COST\047\073 end if\073
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
  if not public.is_store_admin() then raise exception \047NOT_ADMIN\047\073 end if\073
  if p_size is null or char_length(btrim(p_size)) < 1 or char_length(btrim(p_size)) > 20 then
    raise exception \047INVALID_SIZE\047\073
  end if\073
  v_size := btrim(p_size)\073
  if p_quantity is null or p_quantity < 1 or p_quantity > 9999 then
    raise exception \047INVALID_QUANTITY\047\073
  end if\073
  if p_unit_cost is null or p_unit_cost < 0 or p_unit_cost > 99999999 then
    raise exception \047INVALID_COST\047\073
  end if\073
  if p_supplier is not null and char_length(btrim(p_supplier)) > 80 then
    raise exception \047INVALID_SUPPLIER\047\073
  end if\073
  if v_when > now() + interval \0471 day\047 or v_when < timestamptz \0472000-01-01\047 then
    raise exception \047INVALID_DATE\047\073
  end if\073

  select name, sizes into v_name, v_sizes
    from public.products where id = p_product_id for update\073
  if not found then raise exception \047PRODUCT_NOT_FOUND\047\073 end if\073
  if coalesce(array_length(v_sizes, 1), 0) = 0 then
    if v_size <> (chr(217) || \047nico\047) then raise exception \047INVALID_SIZE\047\073 end if\073
  elsif not (v_size = any(v_sizes)) then
    raise exception \047INVALID_SIZE\047\073
  end if\073

  insert into public.product_sizes (product_id, size, stock, purchased_at)
  values (p_product_id, v_size, 0, null)
  on conflict (product_id, size) do nothing\073

  insert into public.purchases
    (product_id, product_name, size, quantity, remaining_quantity, unit_cost,
     supplier, purchased_at, is_opening, is_legacy)
  values
    (p_product_id, v_name, v_size, p_quantity, p_quantity, p_unit_cost,
     coalesce(btrim(p_supplier), \047\047), v_when, false, false)\073

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
  if p_customer_name is null or char_length(btrim(p_customer_name)) < 2 or char_length(btrim(p_customer_name)) > 100 or p_customer_name ~ \047[<>[:cntrl:]]\047 then
    raise exception \047INVALID_CUSTOMER_NAME\047\073
  end if\073
  if p_customer_phone is null or char_length(btrim(p_customer_phone)) < 8 or char_length(btrim(p_customer_phone)) > 30
     or btrim(p_customer_phone) !~ \047^[+0-9 ().-]+$\047
     or char_length(regexp_replace(btrim(p_customer_phone), \047[^0-9]\047, \047\047, \047g\047)) not between 8 and 15 then
    raise exception \047INVALID_PHONE\047\073
  end if\073
  if p_delivery_notes is not null and char_length(p_delivery_notes) > 300 then
    raise exception \047INVALID_NOTES\047\073
  end if\073
  if p_items is null or jsonb_typeof(p_items) <> \047array\047 or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception \047INVALID_ITEMS\047\073
  end if\073

  insert into public.orders (customer_name, customer_phone, delivery_notes, status, total)
  values (btrim(p_customer_name), btrim(p_customer_phone), coalesce(btrim(p_delivery_notes), \047\047), \047pendiente\047, 0)
  returning id into v_order_id\073

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>\047product_id\047)::uuid\073
      v_quantity := (v_item->>\047quantity\047)::integer\073
    exception when others then
      raise exception \047INVALID_ITEM\047\073
    end\073
    v_size := coalesce(nullif(btrim(v_item->>\047size\047), \047\047), (chr(217) || \047nico\047))\073
    if v_quantity is null or v_quantity < 1 or v_quantity > 10 or char_length(v_size) > 20 then
      raise exception \047INVALID_ITEM\047\073
    end if\073

    select p.name, p.price, p.sizes into v_name, v_price, v_sizes
      from public.products p where p.id = v_product_id and p.is_active = true for update\073
    if not found then raise exception \047ITEM_UNAVAILABLE\047\073 end if\073
    if coalesce(array_length(v_sizes, 1), 0) = 0 then
      if v_size <> (chr(217) || \047nico\047) then raise exception \047INVALID_SIZE\047\073 end if\073
    elsif not (v_size = any(v_sizes)) then
      raise exception \047INVALID_SIZE\047\073
    end if\073

    select stock into v_size_stock from public.product_sizes
      where product_id = v_product_id and size = v_size for update\073
    if not found then raise exception \047INVALID_SIZE\047\073 end if\073
    if v_size_stock < v_quantity then raise exception \047STOCK_CHANGED\047\073 end if\073

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
  return jsonb_build_object(\047order_id\047, v_order_id, \047total\047, v_total)\073
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
  if not public.is_store_admin() then raise exception \047NOT_ADMIN\047\073 end if\073
  if p_status not in (\047pendiente\047, \047confirmado\047, \047preparando\047, \047listo\047, \047entregado\047, \047cancelado\047) then
    raise exception \047INVALID_STATUS\047\073
  end if\073
  select status into v_current_status from public.orders where id = p_order_id for update\073
  if not found then raise exception \047ORDER_NOT_FOUND\047\073 end if\073
  if v_current_status in (\047entregado\047, \047cancelado\047) then raise exception \047ORDER_FINALIZED\047\073 end if\073

  if p_status = \047cancelado\047 then
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
  if not public.is_store_admin() then raise exception \047NOT_ADMIN\047\073 end if\073
  if p_size is null or char_length(btrim(p_size)) < 1 or char_length(btrim(p_size)) > 20 then
    raise exception \047INVALID_SIZE\047\073
  end if\073
  v_size := btrim(p_size)\073
  if p_unit_cost is null or p_unit_cost < 0 or p_unit_cost > 99999999 then
    raise exception \047INVALID_COST\047\073
  end if\073
  if p_supplier is not null and char_length(btrim(p_supplier)) > 80 then
    raise exception \047INVALID_SUPPLIER\047\073
  end if\073
  if v_when > now() + interval \0471 day\047 or v_when < timestamptz \0472000-01-01\047 then
    raise exception \047INVALID_DATE\047\073
  end if\073

  update public.purchases
     set unit_cost = p_unit_cost,
         is_opening = false,
         is_legacy = false,
         supplier = coalesce(nullif(btrim(p_supplier), \047\047), supplier),
         purchased_at = v_when
   where product_id = p_product_id and size = v_size
     and is_opening = true and remaining_quantity > 0\073
  get diagnostics v_updated = row_count\073
  if v_updated < 1 then raise exception \047NO_OPENING_STOCK\047\073 end if\073

  update public.product_sizes
     set purchased_at = v_when
   where product_id = p_product_id and size = v_size and stock > 0\073
end\073';

revoke all on function public.regularize_size_cost(uuid, text, numeric, text, timestamptz) from public, anon;
grant execute on function public.regularize_size_cost(uuid, text, numeric, text, timestamptz) to authenticated;
