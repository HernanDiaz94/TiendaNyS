import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Minus, Plus, RefreshCw, ShoppingBag, Truck, X } from 'lucide-react';

import { buildWhatsAppUrl, formatPrice } from '../lib/shop.js';
import { sortSizes, stockState } from '../lib/products.js';
import { Modal } from './Modal.jsx';
import { ProductImage, WhatsAppIcon } from './ui.jsx';

export function ProductModal({ product, onClose, onAdd, whatsappNumber, instagramUrl }) {
  const sizes = useMemo(() => {
    const list = product?.sizes?.length ? product.sizes : ['Único'];
    return sortSizes(list);
  }, [product]);

  const [size, setSize] = useState(sizes[0] || 'Único');
  const [quantity, setQuantity] = useState(1);
  const [modalidad, setModalidad] = useState('retiro');

  useEffect(() => {
    setSize(sizes[0] || 'Único');
    setQuantity(1);
  }, [product?.id, sizes]);

  const stock = Math.max(0, Number(product?.stock) || 0);
  const state = stockState(stock);
  const maxQuantity = Math.min(Math.max(stock, 1), 10);
  const selectedSize = sizes.includes(size) ? size : (sizes[0] || 'Único');

  const inquiryUrl = product
    ? buildWhatsAppUrl(
      whatsappNumber,
      `Hola! Me interesa ${product.name}${selectedSize !== 'Único' ? ` (talle ${selectedSize})` : ''} a ${formatPrice(product.price)}. ${modalidad === 'retiro' ? 'Retiro en el local' : 'Envío / cadetería en CATAMARCA'}. ¿Está disponible?`,
    )
    : null;

  const handleAdd = () => {
    if (!product || stock < 1) return;
    onAdd(product, selectedSize, quantity);
    onClose();
  };

  return (
    <Modal
      open={Boolean(product)}
      onClose={onClose}
      labelledBy="pdp-title"
      className="pdp-modal"
      overlayClassName="overlay--center"
    >
      {product && (
        <div className="pdp">
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            data-autofocus
          >
            <X size={20} aria-hidden="true" />
          </button>

          <div className="pdp-media">
            <ProductImage
              src={product.image_url}
              alt={product.name}
              sizes="(max-width: 899px) 100vw, 50vw"
              eager
            />
            {product.featured && <span className="badge badge--fav pdp-badge">Favorito</span>}
          </div>

          <div className="pdp-info">
            <p className="eyebrow pdp-overline">
              {product.category}{product.color ? ` · ${product.color}` : ''}
            </p>
            <h2 id="pdp-title">{product.name}</h2>

            <div className="pdp-price-row">
              <strong>{formatPrice(product.price)}</strong>
              <span className={`stock-flag stock-flag--${state.tone}`}>
                <i aria-hidden="true" />
                {state.label}
              </span>
            </div>

            <p className="pdp-desc">
              {product.description || 'Una prenda elegida para acompañarte todos los días.'}
            </p>

            <div className="pdp-field">
              <div className="pdp-label">
                <span>Talle</span>
                <small>{sizes.length === 1 ? 'Talle único' : `${sizes.length} disponibles`}</small>
              </div>
              <div className="pdp-sizes" role="group" aria-label="Elegir talle">
                {sizes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={option === selectedSize ? 'selected' : ''}
                    aria-pressed={option === selectedSize}
                    onClick={() => setSize(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="pdp-buy">
              <div className="stepper" role="group" aria-label="Cantidad">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1 || stock < 1}
                  aria-label="Restar una unidad"
                >
                  <Minus size={15} aria-hidden="true" />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                  disabled={quantity >= maxQuantity || stock < 1}
                  aria-label="Sumar una unidad"
                >
                  <Plus size={15} aria-hidden="true" />
                </button>
              </div>

              <div className="pdp-modalidad">
                <p className="pdp-modalidad-label">Modalidad</p>
                <label>
                  <input
                    type="radio"
                    name="pdp-modalidad"
                    value="retiro"
                    checked={modalidad === 'retiro'}
                    onChange={() => setModalidad('retiro')}
                  />
                  Retiro en el local
                </label>
                <label>
                  <input
                    type="radio"
                    name="pdp-modalidad"
                    value="envio"
                    checked={modalidad === 'envio'}
                    onChange={() => setModalidad('envio')}
                  />
                  Envío / cadetería
                </label>
              </div>

              <button
                type="button"
                className="btn btn--primary pdp-add"
                onClick={handleAdd}
                disabled={stock < 1}
              >
                {stock < 1 ? 'Sin stock' : <>Agregar · {formatPrice(product.price * quantity)}</>}
                {stock > 0 && <ArrowRight size={17} aria-hidden="true" />}
              </button>
            </div>

            {inquiryUrl ? (
              <a className="pdp-wa" href={inquiryUrl} target="_blank" rel="noreferrer">
                <WhatsAppIcon size={18} />
                Consultar disponibilidad por WhatsApp
              </a>
            ) : (
              <a className="pdp-wa" href={instagramUrl} target="_blank" rel="noreferrer">
                Consultar por Instagram
              </a>
            )}

            <ul className="pdp-perks">
              <li><Truck size={15} aria-hidden="true" /> Coordinamos entrega y pago por WhatsApp.</li>
              <li><RefreshCw size={15} aria-hidden="true" /> Stock real, actualizado después de cada pedido.</li>
              <li><Check size={15} aria-hidden="true" /> Comprá sin cuenta y sin datos bancarios.</li>
            </ul>

            <p className="pdp-fine">
              <ShoppingBag size={14} aria-hidden="true" />
              Si elegís varias prendas, podés sumarlas a la misma bolsa y enviar un solo pedido.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
