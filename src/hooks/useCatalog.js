import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import {
  createDemoProduct,
  deleteDemoProduct,
  listDemoProducts,
  updateDemoProduct,
} from '../lib/demoStore.js';

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

  // Hasta ejecutar las migraciones, PostgREST rechaza las columnas nuevas.
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
      setProducts(rows);
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

  const createProduct = useCallback(async (payload) => {
    const record = {
      ...payload,
      purchased_at: payload.purchased_at || new Date().toISOString(),
    };
    if (!isSupabaseConfigured) {
      const created = createDemoProduct(record);
      setProducts(listDemoProducts());
      return created;
    }

    const { data, error: requestError } = await supabase
      .from('products')
      .insert(withoutNewColumns(record))
      .select()
      .single();

    if (requestError) throw new Error(friendlyError(requestError, 'No pudimos crear el artículo.'));
    setProducts((current) => [data, ...current]);
    return data;
  }, []);

  const updateProduct = useCallback(async (id, patch) => {
    if (!isSupabaseConfigured) {
      const updated = updateDemoProduct(id, patch);
      setProducts(listDemoProducts());
      return updated;
    }

    const { data, error: requestError } = await supabase
      .from('products')
      .update(withoutNewColumns(patch))
      .eq('id', id)
      .select()
      .single();

    if (requestError) throw new Error(friendlyError(requestError, 'No pudimos actualizar el artículo.'));
    setProducts((current) => current.map((product) => (product.id === id ? data : product)));
    return data;
  }, []);

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
