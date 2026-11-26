-- NyS paso 2/2: funciones, triggers y grants.
-- ASCII-only e idempotente. Ejecutar completo despues del paso 1, con "Run without RLS".
-- Los bodies son un unico string E'...' sin comillas ni backslashes internos:
-- los textos se construyen con chr() y los puntos y coma son literales.
create or replace function public.sync_product_stock_from_sizes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as E'declare
  v_product_id uuid := coalesce(NEW.product_id, OLD.product_id);
  v_total integer := 0;
  v_oldest timestamptz := null;
begin
  select coalesce(sum(stock), 0)::integer into v_total
    from public.product_sizes where product_id = v_product_id;
  select min(purchased_at) into v_oldest
    from public.product_sizes where product_id = v_product_id and stock > 0;
  update public.products
     set stock = least(9999, v_total),
         purchased_at = coalesce(v_oldest, purchased_at, now())
   where id = v_product_id;
  return null;
end;';

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
  v_missing_cost integer := 0;
  v_with_stock integer := 0;
begin
  if TG_OP = (chr(73)||chr(78)||chr(83)||chr(69)||chr(82)||chr(84)) then
    if coalesce(NEW.is_active, false) then
      if NEW.price is null or NEW.price <= 0 then
        raise exception using message = (chr(80)||chr(85)||chr(66)||chr(76)||chr(73)||chr(83)||chr(72)||chr(95)||chr(82)||chr(69)||chr(81)||chr(85)||chr(73)||chr(82)||chr(69)||chr(83)||chr(95)||chr(80)||chr(82)||chr(73)||chr(67)||chr(69));
      end if;
      select count(*) into v_with_stock from public.product_sizes
        where product_id = NEW.id and stock > 0;
      if v_with_stock < 1 then raise exception using message = (chr(80)||chr(85)||chr(66)||chr(76)||chr(73)||chr(83)||chr(72)||chr(95)||chr(82)||chr(69)||chr(81)||chr(85)||chr(73)||chr(82)||chr(69)||chr(83)||chr(95)||chr(83)||chr(84)||chr(79)||chr(67)||chr(75)); end if;
      select count(*) into v_missing_cost from public.product_sizes ps
        where ps.product_id = NEW.id and ps.stock > 0
          and not exists (
            select 1 from public.purchases pu
            where pu.product_id = NEW.id and pu.size = ps.size
              and pu.is_opening = false and pu.unit_cost is not null
              and pu.remaining_quantity > 0
          );
      if v_missing_cost > 0 then raise exception using message = (chr(80)||chr(85)||chr(66)||chr(76)||chr(73)||chr(83)||chr(72)||chr(95)||chr(82)||chr(69)||chr(81)||chr(85)||chr(73)||chr(82)||chr(69)||chr(83)||chr(95)||chr(67)||chr(79)||chr(83)||chr(84)); end if;
    end if;
    return NEW;
  end if;

  if coalesce(OLD.is_active, false) = false and coalesce(NEW.is_active, false) = true then
    if NEW.price is null or NEW.price <= 0 then
      raise exception using message = (chr(80)||chr(85)||chr(66)||chr(76)||chr(73)||chr(83)||chr(72)||chr(95)||chr(82)||chr(69)||chr(81)||chr(85)||chr(73)||chr(82)||chr(69)||chr(83)||chr(95)||chr(80)||chr(82)||chr(73)||chr(67)||chr(69));
    end if;
    select count(*) into v_with_stock from public.product_sizes
      where product_id = NEW.id and stock > 0;
    if v_with_stock < 1 then raise exception using message = (chr(80)||chr(85)||chr(66)||chr(76)||chr(73)||chr(83)||chr(72)||chr(95)||chr(82)||chr(69)||chr(81)||chr(85)||chr(73)||chr(82)||chr(69)||chr(83)||chr(95)||chr(83)||chr(84)||chr(79)||chr(67)||chr(75)); end if;
    select count(*) into v_missing_cost from public.product_sizes ps
      where ps.product_id = NEW.id and ps.stock > 0
        and not exists (
          select 1 from public.purchases pu
          where pu.product_id = NEW.id and pu.size = ps.size
            and pu.is_opening = false and pu.unit_cost is not null
            and pu.remaining_quantity > 0
        );
    if v_missing_cost > 0 then raise exception using message = (chr(80)||chr(85)||chr(66)||chr(76)||chr(73)||chr(83)||chr(72)||chr(95)||chr(82)||chr(69)||chr(81)||chr(85)||chr(73)||chr(82)||chr(69)||chr(83)||chr(95)||chr(67)||chr(79)||chr(83)||chr(84)); end if;
  end if;
  return NEW;
end;';

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
  v_name text := null;
  v_size text := null;
  v_sizes text[] := null;
  v_when timestamptz := coalesce(p_purchased_at, now());
begin
  if not public.is_store_admin() then raise exception using message = (chr(78)||chr(79)||chr(84)||chr(95)||chr(65)||chr(68)||chr(77)||chr(73)||chr(78)); end if;
  if p_size is null or char_length(btrim(p_size)) < 1 or char_length(btrim(p_size)) > 20 then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(83)||chr(73)||chr(90)||chr(69));
  end if;
  v_size := btrim(p_size);
  if p_quantity is null or p_quantity < 1 or p_quantity > 9999 then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(81)||chr(85)||chr(65)||chr(78)||chr(84)||chr(73)||chr(84)||chr(89));
  end if;
  if p_unit_cost is null or p_unit_cost < 0 or p_unit_cost > 99999999 then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(67)||chr(79)||chr(83)||chr(84));
  end if;
  if p_supplier is not null and char_length(btrim(p_supplier)) > 80 then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(83)||chr(85)||chr(80)||chr(80)||chr(76)||chr(73)||chr(69)||chr(82));
  end if;
  if v_when > now() + make_interval(days => 1) or v_when < make_date(2000,1,1)::timestamptz then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(68)||chr(65)||chr(84)||chr(69));
  end if;

  select name, sizes into v_name, v_sizes
    from public.products where id = p_product_id for update;
  if not found then raise exception using message = (chr(80)||chr(82)||chr(79)||chr(68)||chr(85)||chr(67)||chr(84)||chr(95)||chr(78)||chr(79)||chr(84)||chr(95)||chr(70)||chr(79)||chr(85)||chr(78)||chr(68)); end if;
  if coalesce(array_length(v_sizes, 1), 0) = 0 then
    if v_size <> (chr(217) || chr(110)||chr(105)||chr(99)||chr(111)) then raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(83)||chr(73)||chr(90)||chr(69)); end if;
  elsif not (v_size = any(v_sizes)) then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(83)||chr(73)||chr(90)||chr(69));
  end if;

  insert into public.product_sizes (product_id, size, stock, purchased_at)
  values (p_product_id, v_size, 0, null)
  on conflict (product_id, size) do nothing;

  insert into public.purchases
    (product_id, product_name, size, quantity, remaining_quantity, unit_cost,
     supplier, purchased_at, is_opening, is_legacy)
  values
    (p_product_id, v_name, v_size, p_quantity, p_quantity, p_unit_cost,
     coalesce(btrim(p_supplier), left(chr(1),0)), v_when, false, false);

  update public.product_sizes
     set stock = least(9999, stock + p_quantity),
         purchased_at = case
           when stock > 0 and purchased_at is not null then least(purchased_at, v_when)
           else v_when
         end
   where product_id = p_product_id and size = v_size;

  return (select p from public.products p where p.id = p_product_id);
end;';

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
  v_order_id uuid := null;
  v_order_item_id uuid := null;
  v_item jsonb := null;
  v_lot_id uuid := null;
  v_lot_remaining integer := null;
  v_lot_cost numeric(12,2) := null;
  v_lot_opening boolean := null;
  v_product_id uuid := null;
  v_quantity integer := null;
  v_left integer := null;
  v_take integer := null;
  v_size text := null;
  v_size_stock integer := null;
  v_name text := null;
  v_price numeric(12,2) := null;
  v_sizes text[] := null;
  v_total numeric(12,2) := 0;
begin
  if p_customer_name is null or char_length(btrim(p_customer_name)) < 2 or char_length(btrim(p_customer_name)) > 100 or p_customer_name ~ (chr(91)||chr(60)||chr(62)||chr(91)||chr(58)||chr(99)||chr(110)||chr(116)||chr(114)||chr(108)||chr(58)||chr(93)||chr(93)) then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(67)||chr(85)||chr(83)||chr(84)||chr(79)||chr(77)||chr(69)||chr(82)||chr(95)||chr(78)||chr(65)||chr(77)||chr(69));
  end if;
  if p_customer_phone is null or char_length(btrim(p_customer_phone)) < 8 or char_length(btrim(p_customer_phone)) > 30
     or btrim(p_customer_phone) !~ (chr(94)||chr(91)||chr(43)||chr(48)||chr(45)||chr(57)||chr(32)||chr(40)||chr(41)||chr(46)||chr(45)||chr(93)||chr(43)||chr(36))
     or char_length(regexp_replace(btrim(p_customer_phone), chr(91)||chr(94)||chr(48)||chr(45)||chr(57)||chr(93), left(chr(1),0), chr(103))) not between 8 and 15 then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(80)||chr(72)||chr(79)||chr(78)||chr(69));
  end if;
  if p_delivery_notes is not null and char_length(p_delivery_notes) > 300 then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(78)||chr(79)||chr(84)||chr(69)||chr(83));
  end if;
  if p_items is null or jsonb_typeof(p_items) <> (chr(97)||chr(114)||chr(114)||chr(97)||chr(121)) or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(73)||chr(84)||chr(69)||chr(77)||chr(83));
  end if;

  insert into public.orders (customer_name, customer_phone, delivery_notes, status, total)
  values (btrim(p_customer_name), btrim(p_customer_phone), coalesce(btrim(p_delivery_notes), left(chr(1),0)), chr(112)||chr(101)||chr(110)||chr(100)||chr(105)||chr(101)||chr(110)||chr(116)||chr(101), 0)
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>(chr(112)||chr(114)||chr(111)||chr(100)||chr(117)||chr(99)||chr(116)||chr(95)||chr(105)||chr(100)))::uuid;
      v_quantity := (v_item->>(chr(113)||chr(117)||chr(97)||chr(110)||chr(116)||chr(105)||chr(116)||chr(121)))::integer;
    exception when others then
      raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(73)||chr(84)||chr(69)||chr(77));
    end;
    v_size := coalesce(nullif(btrim(v_item->>(chr(115)||chr(105)||chr(122)||chr(101))), left(chr(1),0)), (chr(217) || chr(110)||chr(105)||chr(99)||chr(111)));
    if v_quantity is null or v_quantity < 1 or v_quantity > 10 or char_length(v_size) > 20 then
      raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(73)||chr(84)||chr(69)||chr(77));
    end if;

    select p.name, p.price, p.sizes into v_name, v_price, v_sizes
      from public.products p where p.id = v_product_id and p.is_active = true for update;
    if not found then raise exception using message = (chr(73)||chr(84)||chr(69)||chr(77)||chr(95)||chr(85)||chr(78)||chr(65)||chr(86)||chr(65)||chr(73)||chr(76)||chr(65)||chr(66)||chr(76)||chr(69)); end if;
    if coalesce(array_length(v_sizes, 1), 0) = 0 then
      if v_size <> (chr(217) || chr(110)||chr(105)||chr(99)||chr(111)) then raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(83)||chr(73)||chr(90)||chr(69)); end if;
    elsif not (v_size = any(v_sizes)) then
      raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(83)||chr(73)||chr(90)||chr(69));
    end if;

    select stock into v_size_stock from public.product_sizes
      where product_id = v_product_id and size = v_size for update;
    if not found then raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(83)||chr(73)||chr(90)||chr(69)); end if;
    if v_size_stock < v_quantity then raise exception using message = (chr(83)||chr(84)||chr(79)||chr(67)||chr(75)||chr(95)||chr(67)||chr(72)||chr(65)||chr(78)||chr(71)||chr(69)||chr(68)); end if;

    insert into public.order_items (order_id, product_id, product_name, size, quantity, unit_price)
      values (v_order_id, v_product_id, v_name, v_size, v_quantity, v_price)
      returning id into v_order_item_id;

    v_left := v_quantity;
    for v_lot_id, v_lot_remaining, v_lot_cost, v_lot_opening in
      select id, remaining_quantity, unit_cost, is_opening
      from public.purchases
      where product_id = v_product_id and size = v_size and remaining_quantity > 0
      order by is_opening desc, purchased_at asc, created_at asc, id asc
      for update
    loop
      exit when v_left < 1;
      v_take := least(v_left, v_lot_remaining);
      insert into public.order_item_lots (order_item_id, purchase_id, quantity, unit_cost, is_opening)
        values (v_order_item_id, v_lot_id, v_take, v_lot_cost, v_lot_opening);
      update public.purchases set remaining_quantity = remaining_quantity - v_take where id = v_lot_id;
      v_left := v_left - v_take;
    end loop;

    if v_left > 0 then
      insert into public.order_item_lots (order_item_id, purchase_id, quantity, unit_cost, is_opening)
        values (v_order_item_id, null, v_left, null, true);
    end if;

    update public.product_sizes set stock = stock - v_quantity
      where product_id = v_product_id and size = v_size;
    v_total := v_total + (v_price * v_quantity);
  end loop;

  update public.orders set total = v_total where id = v_order_id;
  return jsonb_build_object(chr(111)||chr(114)||chr(100)||chr(101)||chr(114)||chr(95)||chr(105)||chr(100), v_order_id, chr(116)||chr(111)||chr(116)||chr(97)||chr(108), v_total);
end;';

revoke all on function public.place_order(text, text, text, jsonb) from public, authenticated;
grant execute on function public.place_order(text, text, text, jsonb) to anon, authenticated;

create or replace function public.admin_update_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as E'declare
  v_current_status text := null;
  v_lot_purchase_id uuid := null;
  v_lot_quantity integer := null;
  v_product_id uuid := null;
  v_size text := null;
  v_quantity integer := null;
begin
  if not public.is_store_admin() then raise exception using message = (chr(78)||chr(79)||chr(84)||chr(95)||chr(65)||chr(68)||chr(77)||chr(73)||chr(78)); end if;
  if p_status not in (chr(112)||chr(101)||chr(110)||chr(100)||chr(105)||chr(101)||chr(110)||chr(116)||chr(101), chr(99)||chr(111)||chr(110)||chr(102)||chr(105)||chr(114)||chr(109)||chr(97)||chr(100)||chr(111), chr(112)||chr(114)||chr(101)||chr(112)||chr(97)||chr(114)||chr(97)||chr(110)||chr(100)||chr(111), chr(108)||chr(105)||chr(115)||chr(116)||chr(111), chr(101)||chr(110)||chr(116)||chr(114)||chr(101)||chr(103)||chr(97)||chr(100)||chr(111), chr(99)||chr(97)||chr(110)||chr(99)||chr(101)||chr(108)||chr(97)||chr(100)||chr(111)) then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(83)||chr(84)||chr(65)||chr(84)||chr(85)||chr(83));
  end if;
  select status into v_current_status from public.orders where id = p_order_id for update;
  if not found then raise exception using message = (chr(79)||chr(82)||chr(68)||chr(69)||chr(82)||chr(95)||chr(78)||chr(79)||chr(84)||chr(95)||chr(70)||chr(79)||chr(85)||chr(78)||chr(68)); end if;
  if v_current_status in (chr(101)||chr(110)||chr(116)||chr(114)||chr(101)||chr(103)||chr(97)||chr(100)||chr(111), chr(99)||chr(97)||chr(110)||chr(99)||chr(101)||chr(108)||chr(97)||chr(100)||chr(111)) then raise exception using message = (chr(79)||chr(82)||chr(68)||chr(69)||chr(82)||chr(95)||chr(70)||chr(73)||chr(78)||chr(65)||chr(76)||chr(73)||chr(90)||chr(69)||chr(68)); end if;

  if p_status = (chr(99)||chr(97)||chr(110)||chr(99)||chr(101)||chr(108)||chr(97)||chr(100)||chr(111)) then
    for v_product_id, v_size, v_quantity in
      select oi.product_id, oi.size, sum(oi.quantity)::integer
      from public.order_items oi
      where oi.order_id = p_order_id and oi.product_id is not null
      group by oi.product_id, oi.size
    loop
      insert into public.product_sizes (product_id, size, stock, purchased_at)
        values (v_product_id, v_size, 0, now())
        on conflict (product_id, size) do nothing;
      update public.product_sizes
         set stock = least(9999, stock + v_quantity)
       where product_id = v_product_id and size = v_size;
    end loop;

    for v_lot_purchase_id, v_lot_quantity in
      select oil.purchase_id, oil.quantity
      from public.order_item_lots oil
      join public.order_items oi on oi.id = oil.order_item_id
      where oi.order_id = p_order_id and oil.purchase_id is not null
      for update
    loop
      update public.purchases set remaining_quantity = least(quantity, remaining_quantity + v_lot_quantity) where id = v_lot_purchase_id;
    end loop;
  end if;
  update public.orders set status = p_status where id = p_order_id;
end;';

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
  v_size text := null;
  v_when timestamptz := coalesce(p_purchased_at, now());
  v_updated integer := 0;
begin
  if not public.is_store_admin() then raise exception using message = (chr(78)||chr(79)||chr(84)||chr(95)||chr(65)||chr(68)||chr(77)||chr(73)||chr(78)); end if;
  if p_size is null or char_length(btrim(p_size)) < 1 or char_length(btrim(p_size)) > 20 then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(83)||chr(73)||chr(90)||chr(69));
  end if;
  v_size := btrim(p_size);
  if p_unit_cost is null or p_unit_cost < 0 or p_unit_cost > 99999999 then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(67)||chr(79)||chr(83)||chr(84));
  end if;
  if p_supplier is not null and char_length(btrim(p_supplier)) > 80 then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(83)||chr(85)||chr(80)||chr(80)||chr(76)||chr(73)||chr(69)||chr(82));
  end if;
  if v_when > now() + make_interval(days => 1) or v_when < make_date(2000,1,1)::timestamptz then
    raise exception using message = (chr(73)||chr(78)||chr(86)||chr(65)||chr(76)||chr(73)||chr(68)||chr(95)||chr(68)||chr(65)||chr(84)||chr(69));
  end if;

  update public.purchases
     set unit_cost = p_unit_cost,
         is_opening = false,
         is_legacy = false,
         supplier = coalesce(nullif(btrim(p_supplier), left(chr(1),0)), supplier),
         purchased_at = v_when
   where product_id = p_product_id and size = v_size
     and is_opening = true and remaining_quantity > 0;
  get diagnostics v_updated = row_count;
  if v_updated < 1 then raise exception using message = (chr(78)||chr(79)||chr(95)||chr(79)||chr(80)||chr(69)||chr(78)||chr(73)||chr(78)||chr(71)||chr(95)||chr(83)||chr(84)||chr(79)||chr(67)||chr(75)); end if;

  update public.product_sizes
     set purchased_at = v_when
   where product_id = p_product_id and size = v_size and stock > 0;
end;';

revoke all on function public.regularize_size_cost(uuid, text, numeric, text, timestamptz) from public, anon;
grant execute on function public.regularize_size_cost(uuid, text, numeric, text, timestamptz) to authenticated;
