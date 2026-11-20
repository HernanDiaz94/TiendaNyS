import { ArrowDownRight, ArrowRight, MapPin, Package, ShieldCheck } from 'lucide-react';
import { ProductImage, WhatsAppIcon } from './ui.jsx';

// Valle Chico, San Fernando del Valle de Catamarca (foto: Catamarca RT).
const HERO_IMAGE = 'https://catamarcartv.com/wp-content/uploads/2024/12/IMG_5197-scaled.jpeg';
const HERO_DETAIL = 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Vista_a%C3%A9rea_de_San_Fernando_del_Valle_de_Catamarca%2C_Argentina.jpg';

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
            Simples<br />
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
            <ProductImage
              src={HERO_IMAGE}
              alt="Valle Chico, San Fernando del Valle de Catamarca, Argentina"
              eager
            />
          </figure>
          <figure className="hero-detail">
            <ProductImage
              src={HERO_DETAIL}
              alt="Vista aérea de San Fernando del Valle de Catamarca, Argentina"
              eager
            />
          </figure>
          <div className="hero-sticker" aria-hidden="true">
            <span>DROP</span>
            <strong>01</strong>
            <small>2026</small>
          </div>
          <a className="hero-coord" href="#coleccion">
            28°28′S · 65°47′W <ArrowDownRight size={13} aria-hidden="true" />
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
