-- NyS: catálogo y pedidos. Ejecutar en Supabase SQL Editor antes de publicar.
-- No poner claves secret/service_role en el navegador ni en variables VITE_*.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '' check (char_length(description) <= 500),
  category text not null,
  color text not null default '' check (char_length(color) <= 40),
  image_url text not null default '' check (char_length(image_url) <= 500),
  price numeric(12,2) not null check (price > 0),
  stock integer not null default 0 check (stock between 0 and 9999),
  sizes text[] not null default array['Único']::text[],
  featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Fecha del stock más antiguo que sigue disponible. Alimenta la alerta de +6 meses.
alter table public.products add column if not exists purchased_at timestamptz;
update public.products set purchased_at = created_at where purchased_at is null;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  customer_dni text check (customer_dni is null or customer_dni ~ '^[0-9]{7,8}$'),
  customer_phone text not null check (char_length(customer_phone) between 8 and 30 and customer_phone ~ '^[+0-9 ().-]+$' and char_length(regexp_replace(customer_phone, '[^0-9]', '', 'g')) between 8 and 15),
  delivery_notes text not null default '' check (char_length(delivery_notes) <= 300),
  status text not null default 'pendiente' check (status in ('pendiente', 'confirmado', 'preparando', 'listo', 'entregado', 'cancelado')),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  size text not null default 'Único',
  quantity integer not null check (quantity between 1 and 10),
  unit_price numeric(12,2) not null check (unit_price > 0)
);

-- Lotes de compra: historial de ingresos de mercadería con costo y proveedor.
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null default '',
  quantity integer not null check (quantity between 1 and 9999),
  unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  supplier text not null default '' check (char_length(supplier) <= 80),
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists products_active_created_idx on public.products (is_active, created_at desc);
create index if not exists purchases_purchased_at_idx on public.purchases (purchased_at desc);

-- Migración de categorías: de la taxonomía vieja ("Indumentaria") a una más
-- útil para una tienda urbana. Es idempotente y conserva los productos existentes.
alter table public.products drop constraint if exists products_category_check;

update public.products
set category = case
  when lower(name) like '%remera%' then 'Remeras'
  when lower(name) like '%camisa%' then 'Camisas'
  when lower(name) like '%pantal%' then 'Pantalones'
  when lower(name) like '%buzo%' or lower(name) like '%campera%' or lower(name) like '%chaleco%' then 'Abrigos'
  when lower(name) like '%zapatilla%' or lower(name) like '%sandalia%' or lower(name) like '%botita%' then 'Calzado'
  else 'Accesorios'
end
where category = 'Indumentaria';

alter table public.products
  add constraint products_category_check
  check (category in ('Remeras', 'Camisas', 'Pantalones', 'Abrigos', 'Calzado', 'Accesorios'));

alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.purchases enable row level security;

create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;
revoke all on function public.is_store_admin() from public, anon;
grant execute on function public.is_store_admin() to authenticated;

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products" on public.products
  for select to anon, authenticated using (is_active = true);
drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products
  for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile" on public.profiles
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders" on public.orders
  for select to authenticated using (public.is_store_admin());
drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders
  for update to authenticated using (public.is_store_admin()) with check (public.is_store_admin());
drop policy if exists "admins read order items" on public.order_items;
create policy "admins read order items" on public.order_items
  for select to authenticated using (public.is_store_admin());
drop policy if exists "admins read purchases" on public.purchases;
create policy "admins read purchases" on public.purchases
  for select to authenticated using (public.is_store_admin());

revoke all on public.profiles, public.orders, public.order_items, public.purchases from anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.purchases to authenticated;

-- Único canal público para crear pedidos: valida los campos, vuelve a consultar precios
-- y bloquea filas de stock para evitar sobreventa. Nunca confía en el precio del navegador.
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
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_size text;
  v_name text;
  v_price numeric(12,2);
  v_stock integer;
  v_sizes text[];
  v_total numeric(12,2) := 0;
begin
  if p_customer_name is null or char_length(btrim(p_customer_name)) < 2 or char_length(btrim(p_customer_name)) > 100 or p_customer_name ~ '[<>[:cntrl:]]' then
    raise exception 'INVALID_CUSTOMER_NAME';
  end if;
  if p_customer_phone is null or char_length(btrim(p_customer_phone)) < 8 or char_length(btrim(p_customer_phone)) > 30
     or btrim(p_customer_phone) !~ '^[+0-9 ().-]+$'
     or char_length(regexp_replace(btrim(p_customer_phone), '[^0-9]', '', 'g')) not between 8 and 15 then
    raise exception 'INVALID_PHONE';
  end if;
  if p_delivery_notes is not null and char_length(p_delivery_notes) > 300 then
    raise exception 'INVALID_NOTES';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'INVALID_ITEMS';
  end if;

  insert into public.orders (customer_name, customer_phone, delivery_notes, status, total)
  values (btrim(p_customer_name), btrim(p_customer_phone), coalesce(btrim(p_delivery_notes), ''), 'pendiente', 0)
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>'product_id')::uuid;
      v_quantity := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'INVALID_ITEM';
    end;
    v_size := coalesce(nullif(btrim(v_item->>'size'), ''), 'Único');
    if v_quantity is null or v_quantity < 1 or v_quantity > 10 or char_length(v_size) > 20 then
      raise exception 'INVALID_ITEM';
    end if;

    select p.name, p.price, p.stock, p.sizes into v_name, v_price, v_stock, v_sizes
      from public.products p where p.id = v_product_id and p.is_active = true for update;
    if not found then raise exception 'ITEM_UNAVAILABLE'; end if;
    if coalesce(array_length(v_sizes, 1), 0) = 0 then
      if v_size <> 'Único' then raise exception 'INVALID_SIZE'; end if;
    elsif not (v_size = any(v_sizes)) then
      raise exception 'INVALID_SIZE';
    end if;
    if v_stock < v_quantity then raise exception 'STOCK_CHANGED'; end if;

    update public.products set stock = stock - v_quantity where id = v_product_id;
    insert into public.order_items (order_id, product_id, product_name, size, quantity, unit_price)
      values (v_order_id, v_product_id, v_name, v_size, v_quantity, v_price);
    v_total := v_total + (v_price * v_quantity);
  end loop;

  update public.orders set total = v_total where id = v_order_id;
  return jsonb_build_object('order_id', v_order_id, 'total', v_total);
end;
$$;
revoke all on function public.place_order(text, text, text, jsonb) from public, authenticated;
grant execute on function public.place_order(text, text, text, jsonb) to anon, authenticated;

-- Cambiar el estado desde el panel con control de permisos y devolución de stock al cancelar.
create or replace function public.admin_update_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current_status text;
begin
  if not public.is_store_admin() then raise exception 'NOT_ADMIN'; end if;
  if p_status not in ('pendiente', 'confirmado', 'preparando', 'listo', 'entregado', 'cancelado') then
    raise exception 'INVALID_STATUS';
  end if;
  select status into v_current_status from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_current_status in ('entregado', 'cancelado') then raise exception 'ORDER_FINALIZED'; end if;

  if p_status = 'cancelado' then
    update public.products p
      set stock = least(9999, p.stock + reserved.quantity)
      from (
        select oi.product_id, sum(oi.quantity)::integer as quantity
        from public.order_items oi
        where oi.order_id = p_order_id and oi.product_id is not null
        group by oi.product_id
      ) reserved
      where reserved.product_id = p.id;
  end if;
  update public.orders set status = p_status where id = p_order_id;
end;
$$;
revoke all on function public.admin_update_order_status(uuid, text) from public, anon;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;

-- Catálogo de ejemplo. Cambiá o eliminá estos artículos desde el panel de administración.
insert into public.products (name, description, category, price, stock, image_url, sizes, color, featured, purchased_at)
select seed.* from (values
('Campera Siena', 'Abrigo liviano con interior suave y calce relajado. Ideal para media estación.', 'Abrigos', 68900, 7, 'https://images.pexels.com/photos/14330778/pexels-photo-14330778.jpeg?auto=compress&cs=tinysrgb&w=1000', array['S','M','L'], 'Arena', true, now()),
('Remera Esencial', 'Algodón pesado de tacto suave, corte recto y pensada para todos los días.', 'Remeras', 24900, 12, 'https://images.pexels.com/photos/6786614/pexels-photo-6786614.jpeg?auto=compress&cs=tinysrgb&w=1000', array['S','M','L','XL'], 'Blanco', true, now()),
('Mochila Urbana', 'Espacio para lo esencial, diseño simple y resistente para el día a día.', 'Accesorios', 54900, 5, 'https://images.pexels.com/photos/12477384/pexels-photo-12477384.jpeg?auto=compress&cs=tinysrgb&w=1000', array['Único'], 'Oliva', true, now()),
('Zapatillas Alba', 'Una silueta clásica y cómoda para acompañarte de la mañana a la noche.', 'Calzado', 79900, 4, 'https://images.pexels.com/photos/33353887/pexels-photo-33353887.jpeg?auto=compress&cs=tinysrgb&w=1000', array['36','37','38','39','40'], 'Coral', false, now()),
('Pantalón Nube', 'Tiro alto y caída fluida. Un básico que combina con todo.', 'Pantalones', 45900, 2, 'https://images.pexels.com/photos/14200504/pexels-photo-14200504.jpeg?auto=compress&cs=tinysrgb&w=1000', array['S','M','L'], 'Negro', false, now()),
('Buzo Monte', 'Frisa suave para los días frescos y las tardes largas.', 'Abrigos', 58900, 6, 'https://images.pexels.com/photos/5789010/pexels-photo-5789010.jpeg?auto=compress&cs=tinysrgb&w=1000', array['S','M','L','XL'], 'Tostado', true, now()),
('Gorra Brisa', 'Visera curva, hebilla regulable y onda relajada.', 'Accesorios', 18900, 9, 'https://images.pexels.com/photos/7562957/pexels-photo-7562957.jpeg?auto=compress&cs=tinysrgb&w=1000', array['Único'], 'Crudo', false, now()),
('Sandalias Costa', 'Livianas y versátiles para acompañar el verano.', 'Calzado', 32900, 0, 'https://images.pexels.com/photos/23692992/pexels-photo-23692992.jpeg?auto=compress&cs=tinysrgb&w=1000', array['37','38','39','40'], 'Suela', false, now()),
('Camisa Oliva', 'Textura natural, botones de madera y calce amplio. Para usar abierta o cerrada.', 'Camisas', 41900, 5, 'https://images.pexels.com/photos/17476810/pexels-photo-17476810.jpeg?auto=compress&cs=tinysrgb&w=1000', array['S','M','L'], 'Oliva', false, now() - interval '212 days'),
('Tote Mercado', 'Bolso amplio de lona para llevar un poco de todo.', 'Accesorios', 15900, 10, 'https://images.pexels.com/photos/17836626/pexels-photo-17836626.jpeg?auto=compress&cs=tinysrgb&w=1000', array['Único'], 'Natural', false, now()),
('Botitas Sur', 'Clásicas, cómodas y listas para caminar la ciudad.', 'Calzado', 89900, 1, 'https://images.pexels.com/photos/19750710/pexels-photo-19750710.jpeg?auto=compress&cs=tinysrgb&w=1000', array['36','37','38','39'], 'Marrón', false, now() - interval '248 days'),
('Chaleco Clara', 'Una capa liviana para sumar abrigo sin perder comodidad.', 'Abrigos', 52900, 2, 'https://images.pexels.com/photos/9904108/pexels-photo-9904108.jpeg?auto=compress&cs=tinysrgb&w=1000', array['S','M','L'], 'Crema', false, now())
) as seed(name, description, category, price, stock, image_url, sizes, color, featured, purchased_at)
where not exists (
  select 1 from public.products existing
  where existing.name = seed.name and existing.color = seed.color
);

-- Imágenes de productos: bucket público de lectura y escritura solo para admin.
-- El panel sube los archivos acá y guarda la URL pública en products.image_url.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists "product images admin insert" on storage.objects;
create policy "product images admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_store_admin());

drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_store_admin())
  with check (bucket_id = 'product-images' and public.is_store_admin());

drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_store_admin());

-- Registrar una compra: guarda el lote, suma stock y conserva la fecha del
-- stock más antiguo para que la alerta de +6 meses no se reinicie al reponer.
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
as $$
declare
  v_product public.products;
  v_when timestamptz := coalesce(p_purchased_at, now());
begin
  if not public.is_store_admin() then raise exception 'NOT_ADMIN'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 9999 then
    raise exception 'INVALID_QUANTITY';
  end if;
  if p_unit_cost is not null and (p_unit_cost < 0 or p_unit_cost > 99999999) then
    raise exception 'INVALID_COST';
  end if;
  if p_supplier is not null and char_length(btrim(p_supplier)) > 80 then
    raise exception 'INVALID_SUPPLIER';
  end if;
  if v_when > now() + interval '1 day' or v_when < timestamptz '2000-01-01' then
    raise exception 'INVALID_DATE';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;

  insert into public.purchases (product_id, product_name, quantity, unit_cost, supplier, purchased_at)
  values (p_product_id, v_product.name, p_quantity, p_unit_cost, coalesce(btrim(p_supplier), ''), v_when);

  update public.products
    set stock = least(9999, stock + p_quantity),
        purchased_at = case
          when stock > 0 and purchased_at is not null then least(purchased_at, v_when)
          else v_when
        end
    where id = p_product_id
    returning * into v_product;

  return v_product;
end;
$$;
revoke all on function public.register_purchase(uuid, integer, numeric, text, timestamptz) from public, anon;
grant execute on function public.register_purchase(uuid, integer, numeric, text, timestamptz) to authenticated;
