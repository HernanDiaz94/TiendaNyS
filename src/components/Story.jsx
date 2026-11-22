import { ArrowUpRight, Instagram } from 'lucide-react';
import { ProductImage } from './ui.jsx';

// Paisajes de Catamarca, Argentina (fotografías libres de Pexels).
const STORY_MAIN = 'https://images.pexels.com/photos/31204629/pexels-photo-31204629.jpeg?auto=compress&cs=tinysrgb&w=1400';
const STORY_DETAIL = 'https://images.pexels.com/photos/21558539/pexels-photo-21558539.jpeg?auto=compress&cs=tinysrgb&w=800';

export function Story({ instagramUrl, handle }) {
  return (
    <section className="story" id="nosotros">
      <div className="story-grid">
        <div className="story-media">
          <figure className="story-main">
            <ProductImage
              src={STORY_MAIN}
              alt="Valle y cerros de los Andes en Catamarca, Argentina"
              sizes="(max-width: 900px) 100vw, 46vw"
            />
          </figure>
          <figure className="story-detail">
            <ProductImage
              src={STORY_DETAIL}
              alt="Ruta entre cerros rojos de Fiambalá, Catamarca"
              sizes="(max-width: 900px) 42vw, 18vw"
            />
          </figure>
          <span className="story-stamp" aria-hidden="true">CTA<br />EST. 2025</span>
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
