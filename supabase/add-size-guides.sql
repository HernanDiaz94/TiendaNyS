-- Size guides for Tienda NyS. Run once in the Supabase SQL Editor.
-- ASCII-only on purpose: it is safe to copy/paste from any editor.
-- Adds the two columns used by the product modal and the admin form,
-- then assigns a generic guide to the 12 existing products by category.

alter table public.products add column if not exists size_guide_key text;
alter table public.products add column if not exists size_measurements jsonb;

update public.products
set size_guide_key = case
  when lower(category) = 'calzado' then 'calzado'
  when lower(category) = 'pantalones' then 'inferior'
  when lower(category) in ('remeras', 'camisas', 'abrigos') then 'superior'
  when lower(category) = 'accesorios' then 'unico'
  else ''
end
where size_guide_key is null;

-- Verification: every active product should have a key.
select name, category, size_guide_key
from public.products
where is_active = true
order by name;
