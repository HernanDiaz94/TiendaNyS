import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { formatPrice } from '../lib/shop.js';
import { getSizeStock, getTotalStock, isNewProduct, sortSizes, stockState } from '../lib/products.js';
import { ProductImage } from './ui.jsx';

export function ProductCard({ product, onOpen, onAdd }) {
  const sizes = useMemo(() => {
    const list = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['Único'];
    return sortSizes(list);
  }, [product.sizes]);

  const [size, setSize] = useState(sizes[0]);

  useEffect(() => {
    if (!sizes.includes(size)) setSize(sizes[0]);
  }, [sizes, size]);

  const stock = getTotalStock(product);
  const selectedStock = getSizeStock(product, size);
  const state = stockState(stock);
  const isNew = isNewProduct(product.created_at);

  return (
    <article className={`product-card ${stock < 1 ? 'is-sold-out' : ''}`}>
      <div className="card-media">
        <button
          className="media-hit"
          type="button"
          onClick={() => onOpen(product)}
          aria-label={`Ver detalle de ${product.name}`}
        >
          <ProductImage src={product.image_url} alt={product.name} className="card-image" />
        </button>

        <div className="card-badges" aria-hidden="true">
          {product.featured && <span className="badge badge--fav">Favorito</span>}
          {isNew && stock > 0 && <span className="badge badge--new">Nuevo</span>}
          {stock >= 1 && stock <= 2 && <span className="badge badge--low">{state.label}</span>}
          {stock < 1 && <span className="badge badge--sold">Agotado</span>}
        </div>

        <button
          className="quick-add"
          type="button"
          onClick={() => onAdd(product, size, 1)}
          disabled={selectedStock < 1}
          aria-label={
            selectedStock < 1
              ? `${product.name} talle ${size} agotado`
              : `Agregar ${product.name} talle ${size} a la bolsa`
          }
        >
          <Plus size={16} aria-hidden="true" />
          <span>{selectedStock < 1 ? 'Agotado' : 'Agregar'}</span>
        </button>
      </div>

      <div className="card-body">
        <div className="card-overline">
          <span>{product.category}</span>
          {product.color && <span>{product.color}</span>}
        </div>

        <button className="card-name" type="button" onClick={() => onOpen(product)}>
          {product.name}
        </button>

        <div className="card-price-row">
          <strong>{formatPrice(product.price)}</strong>
          <span className={`stock-flag stock-flag--${state.tone}`}>
            <i aria-hidden="true" />
            {state.label}
          </span>
        </div>

        {sizes.length > 1 ? (
          <div className="card-sizes" role="group" aria-label={`Talles disponibles de ${product.name}`}>
            {sizes.slice(0, 6).map((option) => (
              <button
                key={option}
                type="button"
                className={option === size ? 'selected' : ''}
                aria-pressed={option === size}
                disabled={getSizeStock(product, option) < 1}
                onClick={() => setSize(option)}
              >
                {option}
              </button>
            ))}
            {sizes.length > 6 && <span className="size-more">+{sizes.length - 6}</span>}
          </div>
        ) : (
          <p className="card-single-size">Talle {sizes[0]}</p>
        )}
      </div>
    </article>
  );
}
