import { ArrowUpRight, Instagram, Search, ShoppingBag } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle.jsx';

export function Header({ count, onCart, onSearch, instagramUrl }) {
  return (
    <header className="site-head">
      <div className="announce">
        <span>Nueva colección disponible</span>
        <i aria-hidden="true" />
        <span>Comprá sin cuenta</span>
        <i aria-hidden="true" />
        <span>Coordinamos por WhatsApp</span>
      </div>

      <div className="head-inner">
        <a className="logo" href="/" aria-label="NyS Indumentaria, inicio">
          <span className="logo-mark">N<span>&amp;</span>S</span>
          <small>INDUMENTARIA</small>
        </a>

        <nav className="head-nav" aria-label="Navegación principal">
          <a href="#coleccion">Colección</a>
          <a href="#nosotros">Nosotros</a>
          <a href={instagramUrl} target="_blank" rel="noreferrer">
            Instagram <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        </nav>

        <div className="head-actions">
          <ThemeToggle />
          <button className="icon-btn" type="button" onClick={onSearch} aria-label="Buscar productos">
            <Search size={19} aria-hidden="true" />
          </button>
          <a
            className="icon-btn icon-btn--ig"
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="NyS en Instagram"
          >
            <Instagram size={18} aria-hidden="true" />
          </a>
          <button
            className="cart-btn"
            type="button"
            onClick={onCart}
            aria-label={`Abrir mi bolsa, ${count} ${count === 1 ? 'artículo' : 'artículos'}`}
          >
            <ShoppingBag size={18} aria-hidden="true" />
            <span className="cart-btn-label">Bolsa</span>
            <b aria-hidden="true">{count}</b>
          </button>
        </div>
      </div>
    </header>
  );
}
