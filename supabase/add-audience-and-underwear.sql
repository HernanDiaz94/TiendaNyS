-- NyS: publico (hombre / mujer / unisex) + categoria Ropa interior.
-- Ejecutar una vez en Supabase SQL Editor. ASCII-only: se puede copiar y pegar.
-- Idempotente: se puede correr dos veces sin duplicar productos.

-- 1) Etiqueta de publico. Sin etiqueta = unisex.
alter table public.products add column if not exists audience text not null default 'unisex';
update public.products set audience = 'unisex' where audience is null or audience = '';
alter table public.products drop constraint if exists products_audience_check;
alter table public.products
  add constraint products_audience_check
  check (audience in ('unisex', 'hombre', 'mujer'));

-- 2) Nueva categoria permitida.
alter table public.products drop constraint if exists products_category_check;
alter table public.products
  add constraint products_category_check
  check (category in ('Remeras', 'Camisas', 'Pantalones', 'Abrigos', 'Calzado', 'Accesorios', 'Ropa interior'));

-- 3) Etiquetas de ejemplo para parte del catalogo actual (el resto queda unisex).
update public.products
set audience = 'mujer'
where audience = 'unisex'
  and (name like 'Pantal%n Nube' or name in ('Sandalias Costa', 'Botitas Sur'));
update public.products
set audience = 'hombre'
where audience = 'unisex'
  and name in ('Buzo Monte', 'Camisa Oliva');

-- 4) Guia de talles propia para ropa interior.
update public.products
set size_guide_key = 'interior'
where lower(category) = 'ropa interior'
  and (size_guide_key is null or size_guide_key = '');

-- 5) Tres articulos de ejemplo. Los nombres con acento se arman con chr().
insert into public.products (name, description, category, audience, price, stock, image_url, sizes, color, featured, purchased_at, size_guide_key)
select seed.* from (values
('Boxer Tierra', 'Boxer de algodon con elastano, cintura comoda y calce libre.', 'Ropa interior', 'hombre', 14900, 8, 'https://images.pexels.com/photos/17459893/pexels-photo-17459893.jpeg?auto=compress&cs=tinysrgb&w=1000', array['S','M','L','XL'], 'Arena', false, now(), 'interior'),
('Bombach' || chr(243) || 'n Arena', 'Bombachon de algodon suave, tiro alto y terminaciones textiles.', 'Ropa interior', 'mujer', 18900, 6, 'https://images.pexels.com/photos/11010391/pexels-photo-11010391.jpeg?auto=compress&cs=tinysrgb&w=1000', array['S','M','L'], 'Tostado', false, now(), 'interior'),
('Pack B' || chr(225) || 'sico x3', 'Set de tres piezas lisas, comodas y para usar todos los dias.', 'Ropa interior', 'unisex', 29900, 4, 'https://images.pexels.com/photos/11010388/pexels-photo-11010388.jpeg?auto=compress&cs=tinysrgb&w=1000', array['S','M','L'], 'Crudo', false, now(), 'interior')
) as seed(name, description, category, audience, price, stock, image_url, sizes, color, featured, purchased_at, size_guide_key)
where not exists (
  select 1 from public.products existing
  where existing.name = seed.name and existing.color = seed.color
);

-- Verificacion: 15 filas activas, con audience y guia por producto.
select name, category, audience, size_guide_key
from public.products
where is_active = true
order by category, name;
