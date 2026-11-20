import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addToCart,
  cartCount,
  cartTotal,
  changeQuantity,
  reconcileCart,
  sanitizeCart,
} from '../lib/shop.js';

const CART_KEY = 'nys-cart-v2';

function readStoredCart() {
  try {
    return sanitizeCart(JSON.parse(window.localStorage.getItem(CART_KEY) || '[]'));
  } catch {
    return [];
  }
}

export function useCart() {
  const [cart, setCartState] = useState(readStoredCart);
  const cartRef = useRef(cart);

  const commit = useCallback((updater) => {
    const previous = cartRef.current;
    const next = updater(previous);
    if (next === previous) return null;
    cartRef.current = next;
    setCartState(next);
    return next;
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* storage may be disabled or full */
    }
  }, [cart]);

  const add = useCallback((product, size, quantity = 1) => {
    let status = 'added';
    commit((current) => {
      const next = addToCart(current, product, size, quantity);
      if (next === current) {
        status = Number(product?.stock) < 1 ? 'out' : 'limit';
        return current;
      }
      return next;
    });
    return status;
  }, [commit]);

  const setQuantity = useCallback((item, quantity) => {
    commit((current) => changeQuantity(current, item.id, item.size, quantity));
  }, [commit]);

  const increment = useCallback((item) => {
    commit((current) => changeQuantity(current, item.id, item.size, item.quantity + 1));
  }, [commit]);

  const decrement = useCallback((item) => {
    commit((current) => changeQuantity(current, item.id, item.size, item.quantity - 1));
  }, [commit]);

  const remove = useCallback((item) => {
    commit((current) => current.filter(
      (entry) => entry.id !== item.id || entry.size !== item.size,
    ));
  }, [commit]);

  const clear = useCallback(() => {
    commit((current) => (current.length ? [] : current));
  }, [commit]);

  const reconcile = useCallback((products) => {
    commit((current) => reconcileCart(current, products));
  }, [commit]);

  const count = useMemo(() => cartCount(cart), [cart]);
  const total = useMemo(() => cartTotal(cart), [cart]);

  return {
    cart,
    count,
    total,
    add,
    setQuantity,
    increment,
    decrement,
    remove,
    clear,
    reconcile,
  };
}
