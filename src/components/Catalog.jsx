import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, Search, X } from 'lucide-react';
import { filterProducts, getCatalogCategories, getCatalogSizes, SORT_OPTIONS } from '../lib/products.js';
import { ProductCard } from './ProductCard.jsx';
import { Notice } from './ui.jsx';

const AUDIENCE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
];

function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <span className="skeleton skeleton-media" />
      <span className="skeleton skeleton-line" />
      <span className="skeleton skeleton-line skeleton-line--short" />
    </div>
  );
}

export function Catalog({
  products,
  loading,
  error,
  onRetry,
  onOpen,
  onAdd,
  searchRef,
}) {
  const [category, setCategory] = useState('Todo');
  const [audience, setAudience] = useState('');
  const [size, setSize] = useState('Todos');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const categoryOptions = useMemo(() => getCatalogCategories(products), [products]);
  const sizeOptions = useMemo(() => getCatalogSizes(products), [products]);
  const activeCount = useMemo(
    () => products.filter((product) => product.is_active !== false).length,
    [products],
  );

  useEffect(() => {
    if (category !== 'Todo' && !categoryOptions.some((option) => option.category === category)) {
      setCategory('Todo');
    }
  }, [category, categoryOptions]);

  useEffect(() => {
    if (size !== 'Todos' && !sizeOptions.includes(size)) setSize('Todos');
  }, [size, sizeOptions]);

  const visible = useMemo(
    () => filterProducts(products, {
      category,
      audience,
      size,
      query: deferredQuery,
      sort,
      onlyAvailable,
    }),
    [products, category, audience, size, deferredQuery, sort, onlyAvailable],
  );

  const hasFilters = category !== 'Todo'
    || audience !== ''
    || size !== 'Todos'
    || query.trim().length > 0
    || onlyAvailable;

  const clearFilters = () => {
    setCategory('Todo');
    setAudience('');
    setSize('Todos');
    setQuery('');
    setSort('featured');
    setOnlyAvailable(false);
  };

  const resultLabel = `${visible.length} ${visible.length === 1 ? 'artículo' : 'artículos'}`;

  return (
    <section className="catalog" id="coleccion">
      <div className="section-head">
        <div>
          <p className="eyebrow">DROP 01 · DISPONIBLE ONLINE</p>
          <h2>Elegí tu <em>onda.</em></h2>
          <p className="section-lede">
            Pocas prendas, bien elegidas. Filtrá por categoría, público o talle y armá tu look.
          </p>
        </div>
        <span className="section-count" aria-hidden="true">
          {String(activeCount).padStart(2, '0')} <small>ARTÍCULOS</small>
        </span>
      </div>

      <div className="catalog-toolbar">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar artículos</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar remeras, buzos, accesorios…"
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Borrar búsqueda">
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>

        <label className="sort-box">
          <span className="sr-only">Ordenar productos</span>
          <SlidersHorizontal size={15} aria-hidden="true" />
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-block">
        <div className="chips" role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            className={`chip ${category === 'Todo' ? 'is-active' : ''}`}
            aria-pressed={category === 'Todo'}
            onClick={() => setCategory('Todo')}
          >
            Todo <span>{activeCount}</span>
          </button>
          {categoryOptions.map((option) => (
            <button
              key={option.category}
              type="button"
              className={`chip ${category === option.category ? 'is-active' : ''}`}
              aria-pressed={category === option.category}
              onClick={() => setCategory(option.category)}
            >
              {option.category} <span>{option.count}</span>
            </button>
          ))}
        </div>

        <div className="size-filter">
          <span className="filter-label">Público</span>
          <div className="chips chips--sizes" role="group" aria-label="Filtrar por público">
            {AUDIENCE_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`chip chip--sm ${audience === option.value ? 'is-active' : ''}`}
                aria-pressed={audience === option.value}
                onClick={() => setAudience(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {sizeOptions.length > 1 && (
          <div className="size-filter">
            <span className="filter-label">Talle</span>
            <div className="chips chips--sizes" role="group" aria-label="Filtrar por talle">
              <button
                type="button"
                className={`chip chip--sm ${size === 'Todos' ? 'is-active' : ''}`}
                aria-pressed={size === 'Todos'}
                onClick={() => setSize('Todos')}
              >
                Todos
              </button>
              {sizeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`chip chip--sm ${size === option ? 'is-active' : ''}`}
                  aria-pressed={size === option}
                  onClick={() => setSize(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="results-bar">
        <p aria-live="polite">
          {loading ? 'Cargando colección…' : resultLabel}
          {query.trim() && !loading ? ` para “${query.trim()}”` : ''}
        </p>
        <div className="results-actions">
          <label className="switch">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(event) => setOnlyAvailable(event.target.checked)}
            />
            <span className="switch-track" aria-hidden="true"><span /></span>
            <span>Solo con stock</span>
          </label>
          {hasFilters && (
            <button type="button" className="link-btn" onClick={clearFilters}>
              Limpiar filtros <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <Notice tone="error">
          {error}{' '}
          <button type="button" className="link-btn link-btn--inline" onClick={() => onRetry()}>
            Reintentar
          </button>
        </Notice>
      )}

      {loading ? (
        <div className="product-grid">
          {Array.from({ length: 8 }, (_, index) => <SkeletonCard key={index} />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-mark" aria-hidden="true">Ø</span>
          <h3>No encontramos nada con esos filtros.</h3>
          <p>Probá con otra categoría, otro talle o una búsqueda más corta.</p>
          <button type="button" className="btn btn--primary" onClick={clearFilters}>
            Ver todo el catálogo
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {visible.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpen={onOpen}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}

      <div className="catalog-foot">
        <span>STOCK REAL · ACTUALIZADO A MANO</span>
        <a href="#nosotros">Conocé NyS <span aria-hidden="true">↓</span></a>
      </div>
    </section>
  );
}
