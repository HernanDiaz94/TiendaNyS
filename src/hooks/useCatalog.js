import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import {
  createDemoProduct,
  deleteDemoProduct,
  listDemoProducts,
  updateDemoProduct,
} from '../lib/demoStore.js';

function attachStockBySize(products, rows) {
  const byId = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(row.product_id);
    if (!byId.has(key)) byId.set(key, {});
    byId.get(key)[String(row.size)] = Number(row.stock) || 0;
  }
  return (products || []).map((product) => ({
    ...product,
    stock_by_size: byId.get(String(product.id)) || {},
  }));
}

function friendlyError(error, fallback) {
  const message = String(error?.message || '');
  if (message.includes('row-level security') || message.includes('permission denied')) {
    return 'Tu usuario no tiene permisos de administración sobre el catálogo.';
  }
  if (message.includes('duplicate key')) return 'Ya existe un artículo con esos datos.';
  if (message.includes('check constraint') || message.includes('violates check')) {
    return 'Algunos datos no son válidos. Revisá el precio, el stock y los talles.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'No pudimos conectar con la base de datos. Revisá tu conexión.';
  }
  return fallback;
}

export function useCatalog({ includeInactive = false } = {}) {
  const [products, setProducts] = useState(() => (isSupabaseConfigured ? [] : listDemoProducts()));
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const supportsSizeGuides = useRef(true);
  const supportsAudience = useRef(true);
  const supportsProductSizes = useRef(true);

  // Hasta ejecutar las migraciones, PostgREST rechaza las columnas/tablas nuevas.
  // En ese caso las omitimos para no romper el CRUD existente; la tienda igual
  // muestra la guía genérica según la categoría y trata sin etiqueta como unisex.
  function withoutNewColumns(record) {
    let result = record;
    if (!supportsSizeGuides.current) {
      const { size_guide_key: _key, size_measurements: _measurements, ...rest } = result;
      result = rest;
    }
    if (!supportsAudience.current) {
      const { audience: _audience, ...rest } = result;
      result = rest;
    }
    if (!supportsProductSizes.current) {
      const { stock_by_size: _sizes, ...rest } = result;
      result = rest;
    }
    return result;
  }

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!isSupabaseConfigured) {
      setProducts(listDemoProducts());
      setLoading(false);
      setError('');
      return;
    }

    if (!silent) setLoading(true);
    let request = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includeInactive) request = request.eq('is_active', true);

    const { data, error: requestError } = await request;
    if (!mounted.current) return;

    if (requestError) {
      setError(friendlyError(requestError, 'No pudimos cargar el catálogo. Intentá de nuevo.'));
    } else {
      const rows = data || [];
      if (rows.length > 0) {
        supportsSizeGuides.current = Object.prototype.hasOwnProperty.call(rows[0], 'size_guide_key');
        supportsAudience.current = Object.prototype.hasOwnProperty.call(rows[0], 'audience');
      } else {
        const { error: guidesError } = await supabase
          .from('products')
          .select('size_guide_key')
          .limit(1);
        const { error: audienceError } = await supabase
          .from('products')
          .select('audience')
          .limit(1);
        supportsSizeGuides.current = !guidesError;
        supportsAudience.current = !audienceError;
      }

      const { data: sizeRows, error: sizesError } = await supabase
        .from('product_sizes')
        .select('product_id, size, stock')
        .limit(1000);
      supportsProductSizes.current = !sizesError;
      setProducts(supportsProductSizes.current ? attachStockBySize(rows, sizeRows) : rows);
      setError('');
    }
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const syncProductSizes = useCallback(async (productId, stockBySize) => {
    if (!supportsProductSizes.current) return;
    const entries = Object.entries(stockBySize || {}).map(([size, stock]) => ({
      product_id: productId,
      size: String(size),
      stock: Math.max(0, Math.min(9999, Math.trunc(Number(stock) || 0))),
    }));

    if (entries.length > 0) {
      const { error } = await supabase
        .from('product_sizes')
        .upsert(entries, { onConflict: 'product_id,size' });
      if (error) throw new Error(friendlyError(error, 'No pudimos guardar el stock por talle.'));
    }

    const { data: existing, error: listError } = await supabase
      .from('product_sizes')
      .select('size')
      .eq('product_id', productId);
    if (listError) throw new Error(friendlyError(listError, 'No pudimos leer el stock por talle.'));

    const keep = new Set(entries.map((entry) => entry.size.toLowerCase()));
    const remove = (existing || [])
      .map((row) => String(row.size))
      .filter((size) => !keep.has(size.toLowerCase()));
    if (remove.length > 0) {
      const { error } = await supabase
        .from('product_sizes')
        .delete()
        .eq('product_id', productId)
        .in('size', remove);
      if (error) throw new Error(friendlyError(error, 'No pudimos limpiar los talles quitados.'));
    }
  }, []);

  const createProduct = useCallback(async (payload) => {
    const { stock_by_size: stockBySize, ...productFields } = payload;
    const record = {
      ...productFields,
      purchased_at: payload.purchased_at || new Date().toISOString(),
    };
    if (!isSupabaseConfigured) {
      const created = createDemoProduct(payload);
      setProducts(listDemoProducts());
      return created;
    }

    const { data, error: requestError } = await supabase
      .from('products')
      .insert(withoutNewColumns(record))
      .select()
      .single();

    if (requestError) throw new Error(friendlyError(requestError, 'No pudimos crear el artículo.'));
    await syncProductSizes(data.id, stockBySize);
    const created = {
      ...data,
      stock_by_size: supportsProductSizes.current ? (stockBySize || {}) : undefined,
    };
    setProducts((current) => [created, ...current]);
    return created;
  }, [syncProductSizes]);

  const updateProduct = useCallback(async (id, patch) => {
    if (!isSupabaseConfigured) {
      const updated = updateDemoProduct(id, patch);
      setProducts(listDemoProducts());
      return updated;
    }

    const { stock_by_size: stockBySize, ...productPatch } = patch;
    if (stockBySize && supportsProductSizes.current) delete productPatch.stock;
    const { data, error: requestError } = await supabase
      .from('products')
      .update(withoutNewColumns(productPatch))
      .eq('id', id)
      .select()
      .single();

    if (requestError) throw new Error(friendlyError(requestError, 'No pudimos actualizar el artículo.'));
    if (supportsProductSizes.current && stockBySize) await syncProductSizes(id, stockBySize);
    const updated = {
      ...data,
      stock_by_size: supportsProductSizes.current
        ? (stockBySize ?? products.find((product) => product.id === id)?.stock_by_size ?? {})
        : undefined,
    };
    setProducts((current) => current.map((product) => (product.id === id ? updated : product)));
    return updated;
  }, [products, syncProductSizes]);

  const deleteProduct = useCallback(async (id) => {
    if (!isSupabaseConfigured) {
      deleteDemoProduct(id);
      setProducts(listDemoProducts());
      return;
    }

    const { error: requestError } = await supabase.from('products').delete().eq('id', id);
    if (requestError) throw new Error(friendlyError(requestError, 'No pudimos eliminar el artículo.'));
    setProducts((current) => current.filter((product) => product.id !== id));
  }, []);

  return {
    products,
    loading,
    error,
    refresh: load,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
