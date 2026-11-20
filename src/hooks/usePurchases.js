import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import {
  createDemoPurchase,
  listDemoPurchases,
} from '../lib/demoStore.js';

function friendlyError(error) {
  const message = String(error?.message || '');
  if (message.includes('NOT_ADMIN') || message.includes('row-level security') || message.includes('permission denied')) {
    return 'Tu usuario no tiene permisos de administración sobre las compras.';
  }
  if (message.includes('PRODUCT_NOT_FOUND')) return 'El artículo ya no existe en el catálogo.';
  if (message.includes('INVALID_QUANTITY')) return 'La cantidad comprada no es válida.';
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'No pudimos conectar con la base de datos. Revisá tu conexión.';
  }
  return 'No pudimos cargar las compras. Si es la primera vez, ejecutá supabase/schema.sql.';
}

export function usePurchases() {
  const [purchases, setPurchases] = useState(() => (isSupabaseConfigured ? [] : listDemoPurchases()));
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!isSupabaseConfigured) {
      setPurchases(listDemoPurchases());
      setLoading(false);
      setError('');
      return;
    }

    if (!silent) setLoading(true);
    const { data, error: requestError } = await supabase
      .from('purchases')
      .select('*')
      .order('purchased_at', { ascending: false })
      .limit(300);
    if (!mounted.current) return;

    if (requestError) {
      setError(friendlyError(requestError));
    } else {
      setPurchases(data || []);
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const registerPurchase = useCallback(async (payload) => {
    if (!isSupabaseConfigured) {
      const result = createDemoPurchase(payload);
      setPurchases(listDemoPurchases());
      return result.product;
    }

    const { data, error: requestError } = await supabase.rpc('register_purchase', {
      p_product_id: payload.productId,
      p_quantity: payload.quantity,
      p_unit_cost: payload.unitCost,
      p_supplier: payload.supplier,
      p_purchased_at: payload.purchasedAt,
    });
    if (requestError) throw new Error(friendlyError(requestError));
    await load({ silent: true });
    return data;
  }, [load]);

  return {
    purchases,
    loading,
    error,
    refresh: load,
    registerPurchase,
  };
}
