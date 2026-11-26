-- NyS: borrar pedidos de prueba y devolver el stock consumido.
-- ASCII-only. Ejecutar en el SQL Editor con "Run without RLS".
-- Los pedidos cancelados ya devolvieron stock, por eso se excluyen del
-- restock para no duplicar unidades.

begin;

-- Asegura que exista el renglon de talle antes de sumar.
insert into public.product_sizes (product_id, size, stock, purchased_at)
select oi.product_id, oi.size, 0, now()
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
 where o.status <> 'cancelado'
   and oi.product_id is not null
on conflict (product_id, size) do nothing;

-- Devuelve las unidades por (producto, talle). products.stock se recalcula
-- automaticamente con el trigger products_sync_stock_from_sizes.
update public.product_sizes ps
   set stock = least(9999, ps.stock + q.quantity)
  from (
    select oi.product_id, oi.size, sum(oi.quantity)::integer as quantity
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
     where o.status <> 'cancelado'
       and oi.product_id is not null
     group by oi.product_id, oi.size
  ) q
 where ps.product_id = q.product_id
   and ps.size = q.size;

-- Devuelve el saldo a los lotes FIFO usados por esos pedidos.
update public.purchases pu
   set remaining_quantity = least(pu.quantity, pu.remaining_quantity + l.quantity)
  from (
    select oil.purchase_id, sum(oil.quantity)::integer as quantity
      from public.order_item_lots oil
      join public.order_items oi on oi.id = oil.order_item_id
      join public.orders o on o.id = oi.order_id
     where o.status <> 'cancelado'
       and oil.purchase_id is not null
     group by oil.purchase_id
  ) l
 where pu.id = l.purchase_id;

-- Borra los pedidos (order_items y order_item_lots se eliminan por cascade).
-- Si queres conservar algunos, agregá un WHERE con la fecha que corresponda.
delete from public.orders;

commit;

-- Verificacion: debe devolver 0 pedidos.
select count(*) as remaining_orders from public.orders;
