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
