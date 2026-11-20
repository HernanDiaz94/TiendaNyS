import { ArrowDownRight, ArrowRight, MapPin, Package, ShieldCheck } from 'lucide-react';
import { ProductImage, WhatsAppIcon } from './ui.jsx';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=88';
const HERO_DETAIL = 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=85';

const MARQUEE_ITEMS = [
  'N&S INDUMENTARIA',
  'CATAMARCA',
  'DROP 01',
  'BÁSICOS CON ACTITUD',
  'COMPRÁ SIN CUENTA',
  'COORDINAMOS POR WHATSAPP',
];

export function Hero({ whatsappUrl, instagramUrl }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-kicker">
            <span aria-hidden="true" /> Nueva colección · Catamarca
          </p>

          <h1 className="hero-title">
            Básicos<br />
            con <em>actitud.</em>
          </h1>

          <p className="hero-lede">
            Prendas urbanas, cómodas y sin vueltas. Elegidas para que las uses todos
            los días y te sientas como sos.
          </p>

          <div className="hero-actions">
            <a className="btn btn--primary" href="#coleccion">
              Ver la colección <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a
              className="btn btn--ghost"
              href={whatsappUrl || instagramUrl}
              target="_blank"
              rel="noreferrer"
            >
              {whatsappUrl ? <WhatsAppIcon size={17} /> : null}
              {whatsappUrl ? 'Consultar stock' : 'Escribinos'}
            </a>
          </div>

          <dl className="hero-facts">
            <div>
              <dt><Package size={15} aria-hidden="true" /> Envíos</dt>
              <dd>A todo el país</dd>
            </div>
            <div>
              <dt><ShieldCheck size={15} aria-hidden="true" /> Sin cuenta</dt>
              <dd>Compra directa</dd>
            </div>
            <div>
              <dt><MapPin size={15} aria-hidden="true" /> Origen</dt>
              <dd>Catamarca</dd>
            </div>
          </dl>
        </div>

        <div className="hero-visual">
          <figure className="hero-main">
            <ProductImage src={HERO_IMAGE} alt="Selección de prendas de NyS Indumentaria" eager />
          </figure>
          <figure className="hero-detail">
            <ProductImage src={HERO_DETAIL} alt="Detalle de texturas y prendas" eager />
          </figure>
          <div className="hero-sticker" aria-hidden="true">
            <span>DROP</span>
            <strong>01</strong>
            <small>2026</small>
          </div>
          <a className="hero-coord" href="#coleccion">
            34°36′S · 58°22′W <ArrowDownRight size={13} aria-hidden="true" />
          </a>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div className="marquee-group" key={copy}>
              {MARQUEE_ITEMS.map((item) => (
                <span key={`${copy}-${item}`}>{item}<b>✦</b></span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
