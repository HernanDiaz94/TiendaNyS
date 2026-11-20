import { ArrowUpRight, Instagram, MapPin } from 'lucide-react';
import { WhatsAppIcon } from './ui.jsx';
import { SITE } from '../config/site.js';

export function Footer({ instagramUrl, whatsappUrl, handle }) {
  return (
    <footer className="site-foot">
      <div className="foot-top">
        <a className="foot-logo" href="/" aria-label="NyS Indumentaria, inicio">
          <span>N<span>&amp;</span>S</span>
          <small>INDUMENTARIA URBANA · CATAMARCA</small>
        </a>
        <p>
          Elegir poco. Elegir bien.<br />
          Gracias por bancar el proyecto.
        </p>
        <div className="foot-social">
          <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label={`Instagram de NyS: @${handle}`}>
            <Instagram size={18} aria-hidden="true" /> @{handle}
          </a>
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noreferrer">
              <WhatsAppIcon size={17} /> WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="foot-bottom">
        <nav className="foot-nav" aria-label="Enlaces del pie">
          <a href="#coleccion">Colección</a>
          <a href="#nosotros">Nosotros</a>
          <a href={instagramUrl} target="_blank" rel="noreferrer">
            Instagram <ArrowUpRight size={12} aria-hidden="true" />
          </a>
          <a href="/admin">Administración</a>
        </nav>
        <p className="copyright">
          © {new Date().getFullYear()} NyS Indumentaria · Hecho con cariño en Catamarca
        </p>
        <div className="foot-addr">
          <span className="foot-addr-line">
            <MapPin size={13} aria-hidden="true" /> {SITE.direccion}
          </span>
          <span>{SITE.horarios}</span>
        </div>
      </div>
    </footer>
  );
}
