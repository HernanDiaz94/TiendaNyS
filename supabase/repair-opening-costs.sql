-- NyS: reparar stock historico sin costo.
-- Costo unitario = 80% del precio de venta (margen del 20% sobre precio).
-- ASCII-only e idempotente. Ejecutar en el SQL Editor con "Run without RLS".
-- No suma unidades: solo convierte los lotes de apertura en lotes con costo.

begin;

update public.purchases pu
   set unit_cost = round((p.price * 0.80)::numeric, 2),
       is_opening = false,
       is_legacy = false,
       supplier = case
         when nullif(btrim(pu.supplier), '') is null then 'Apertura'
         else pu.supplier
       end,
       purchased_at = coalesce(pu.purchased_at, ps.purchased_at, p.purchased_at, now())
  from public.product_sizes ps
  join public.products p on p.id = ps.product_id
 where pu.product_id = ps.product_id
   and pu.size = ps.size
   and pu.is_opening = true
   and pu.remaining_quantity > 0
   and pu.unit_cost is null;

commit;

-- Debe devolver 0: no quedan lotes con stock sin costo.
select count(*) as pending_opening_lots
  from public.purchases
 where is_opening = true
   and remaining_quantity > 0
   and unit_cost is null;
