-- NyS: quitar los articulos de prueba del catalogo real (Supabase).
-- ASCII-only. Ejecutar en el SQL Editor con "Run without RLS".
-- El modo demo no se toca: usa localStorage propio (nys-demo-products-v2).
-- Borra tambien compras y lotes para dejar rentabilidad y stock en cero.

begin;

delete from public.order_item_lots;
delete from public.order_items;
delete from public.orders;
delete from public.purchases;
delete from public.products;

commit;

-- Verificacion: todo debe devolver 0.
select
  (select count(*) from public.products) as products,
  (select count(*) from public.purchases) as purchases,
  (select count(*) from public.orders) as orders;
