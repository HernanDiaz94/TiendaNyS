import { ArrowUpRight, Instagram } from 'lucide-react';
import { ProductImage } from './ui.jsx';

const STORY_MAIN = 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=85';
const STORY_DETAIL = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85';

export function Story({ instagramUrl, handle }) {
  return (
    <section className="story" id="nosotros">
      <div className="story-grid">
        <div className="story-media">
          <figure className="story-main">
            <ProductImage src={STORY_MAIN} alt="Perchero con prendas de la colección NyS" />
          </figure>
          <figure className="story-detail">
            <ProductImage src={STORY_DETAIL} alt="Detalle de zapatillas de la colección" />
          </figure>
          <span className="story-stamp" aria-hidden="true">BS.AS<br />EST. 2025</span>
        </div>

        <div className="story-copy">
          <p className="eyebrow">NOSOTROS</p>
          <h2>Ropa sin vueltas,<br /><em>hecha para la calle.</em></h2>
          <p>
            NyS nació en Catamarca con una idea simple: elegir poco, elegir bien.
            Prendas urbanas, cómodas y accesibles que puedas usar un montón, sin
            comprar de más.
          </p>
          <p>
            Probamos cada prenda antes de subirla. Si no nos la pondríamos, no la vendemos.
          </p>

          <a className="ig-link" href={instagramUrl} target="_blank" rel="noreferrer">
            <Instagram size={18} aria-hidden="true" />
            Seguinos @{handle}
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="steps">
        <article>
          <span className="step-number">01</span>
          <h3>Elegí tu prenda</h3>
          <p>Filtrá por categoría, talle o buscá eso que tenés en la cabeza.</p>
        </article>
        <article>
          <span className="step-number">02</span>
          <h3>Armá la bolsa</h3>
          <p>Sumá todo lo que te guste. No hace falta crear una cuenta.</p>
        </article>
        <article>
          <span className="step-number">03</span>
          <h3>Coordinamos</h3>
          <p>Confirmamos stock, pago y entrega por WhatsApp, sin vueltas.</p>
        </article>
      </div>
    </section>
  );
}
