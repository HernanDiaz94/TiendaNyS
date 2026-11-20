import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  X,
} from 'lucide-react';
import {
  buildInquiryMessage,
  buildOrderMessage,
  buildOrderSummary,
  buildWhatsAppUrl,
  formatPrice,
  shortReference,
  validateCustomer,
} from '../lib/shop.js';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { createDemoOrder } from '../lib/demoStore.js';
import { Modal } from './Modal.jsx';
import { ErrorNote, Notice, ProductImage, Spinner, WhatsAppIcon } from './ui.jsx';

const EMPTY_CUSTOMER = { name: '', phone: '', notes: '' };

function Field({ id, label, error, optional, children }) {
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id}>
        {label} {optional && <span className="optional">(opcional)</span>}
      </label>
      {children}
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

export function CartDrawer({
  open,
  onClose,
  cart,
  total,
  onIncrement,
  onDecrement,
  onRemove,
  onOrderPlaced,
  onRefresh,
  whatsappNumber,
  paymentLink,
}) {
  const [step, setStep] = useState('cart');
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [privacy, setPrivacy] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);
  const [copied, setCopied] = useState(false);

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => {
      setStep('cart');
      setCustomer(EMPTY_CUSTOMER);
      setPrivacy(false);
      setErrors({});
      setFormError('');
      setOrder(null);
      setCopied(false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open]);

  const [modalidad, setModalidad] = useState('retiro');

  const cartWhatsAppUrl = buildWhatsAppUrl(
    whatsappNumber,
    buildInquiryMessage({ items: cart, total, modalidad }),
  );

  const updateCustomer = (field, value) => {
    setCustomer((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateCustomer(customer, privacy);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    setFormError('');
    const snapshot = cart.map((item) => ({
      name: item.name,
      product_name: item.name,
      size: item.size,
      quantity: item.quantity,
      unit_price: item.price,
      price: item.price,
    }));

    try {
      let created;
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.rpc('place_order', {
          p_customer_name: customer.name.trim(),
          p_customer_phone: customer.phone.trim(),
          p_delivery_notes: customer.notes.trim().slice(0, 300),
          p_items: cart.map(({ id, quantity, size }) => ({
            product_id: id,
            quantity,
            size,
          })),
        });
        if (error) throw error;
        const result = Array.isArray(data) ? data[0] : data;
        if (!result?.order_id) throw new Error('La base de datos no confirmó el pedido.');
        created = { id: result.order_id, total: Number(result.total) || total, items: snapshot };
      } else {
        const demoOrder = createDemoOrder({
          customer: {
            name: customer.name,
            phone: customer.phone,
            notes: customer.notes,
          },
          items: cart,
        });
        created = {
          id: demoOrder.id,
          total: Number(demoOrder.total) || total,
          items: demoOrder.order_items,
        };
      }

      setOrder({
        id: created.id,
        total: created.total,
        customer: customer.name.trim(),
        items: created.items,
      });
      setStep('success');
      onOrderPlaced();
    } catch (error) {
      const code = String(error?.code || error?.message || '');
      if (code.includes('STOCK_CHANGED')) {
        setFormError('Se actualizó el stock mientras armabas el pedido. Revisá tu bolsa e intentá de nuevo.');
        onRefresh?.();
      } else if (code.includes('ITEM_UNAVAILABLE') || code.includes('INVALID_SIZE')) {
        setFormError('Uno de los artículos ya no está disponible en el talle elegido. Revisá tu bolsa.');
        onRefresh?.();
      } else if (code.includes('INVALID_CUSTOMER_NAME') || code.includes('INVALID_PHONE')) {
        setFormError('Revisá los datos personales: el nombre o el teléfono no son válidos.');
      } else if (code.includes('INVALID_ITEMS') || code.includes('INVALID_ITEM')) {
        setFormError('La bolsa tiene un artículo con datos inválidos. Volvé a cargarlo.');
      } else {
        setFormError('No pudimos registrar el pedido. Probá de nuevo en unos minutos o escribinos por WhatsApp.');
      }
    } finally {
      setBusy(false);
    }
  };

  const copySummary = async () => {
    if (!order) return;
    const text = buildOrderSummary({
      reference: shortReference(order.id),
      customerName: order.customer,
      items: order.items,
      total: order.total,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
      setFormError('No pudimos copiar automáticamente. Escribinos por Instagram y te pasamos el resumen.');
    }
  };

  const successWhatsAppUrl = order
    ? buildWhatsAppUrl(
      whatsappNumber,
      buildOrderMessage({
        reference: shortReference(order.id),
        customerName: order.customer,
        total: order.total,
        items: order.items,
        modalidad,
      }),
    )
    : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="cart-title"
      className="drawer"
      overlayClassName="overlay--drawer"
    >
      <div className="drawer-head">
        <div>
          <p className="eyebrow">
            {step === 'success' ? 'PEDIDO REGISTRADO' : step === 'checkout' ? 'UN PASO MÁS' : 'TU SELECCIÓN'}
          </p>
          <h2 id="cart-title">
            {step === 'success' ? '¡Listo!' : step === 'checkout' ? 'Tus datos' : 'Mi bolsa'}
            {step === 'cart' && <span className="drawer-count">{count}</span>}
          </h2>
        </div>
        <button className="modal-close modal-close--static" type="button" onClick={onClose} aria-label="Cerrar bolsa">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {step === 'success' && order ? (
        <>
          <div className="drawer-body drawer-body--success">
            <span className="success-mark" aria-hidden="true"><Check size={28} /></span>
            <h3>Recibimos tu pedido.</h3>
            <p>
              Guardamos la solicitud <strong>#{shortReference(order.id)}</strong> por{' '}
              <strong>{formatPrice(order.total)}</strong>. Te vamos a confirmar stock y coordinar la entrega.
            </p>

            <div className="success-actions">
              {successWhatsAppUrl && (
                <a className="btn btn--wa btn--full" href={successWhatsAppUrl} target="_blank" rel="noreferrer">
                  <WhatsAppIcon size={18} /> Confirmar por WhatsApp <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              )}
              {paymentLink && (
                <a className="btn btn--ghost btn--full" href={paymentLink} target="_blank" rel="noreferrer">
                  Ir al link de pago <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              )}
              {!successWhatsAppUrl && (
                <button className="btn btn--ghost btn--full" type="button" onClick={copySummary}>
                  <Copy size={16} aria-hidden="true" /> {copied ? 'Resumen copiado' : 'Copiar resumen del pedido'}
                </button>
              )}
            </div>

            <p className="fine-print">
              El pedido queda pendiente hasta que NyS confirme disponibilidad y pago.
              Nunca te vamos a pedir datos de tarjeta por chat.
            </p>
            <button className="link-btn" type="button" onClick={onClose}>Seguir mirando</button>
          </div>
          <div className="drawer-foot">
            <button className="btn btn--primary btn--full" type="button" onClick={onClose}>
              Volver a la tienda
            </button>
          </div>
        </>
      ) : cart.length === 0 ? (
        <div className="drawer-body drawer-body--empty">
          <span className="empty-bag-mark" aria-hidden="true"><ShoppingBag size={26} /></span>
          <h3>Tu bolsa está vacía.</h3>
          <p>Cuando veas algo que te guste, sumalo. Después lo coordinamos por WhatsApp.</p>
          <button className="btn btn--primary" type="button" onClick={onClose}>
            Ver la colección
          </button>
        </div>
      ) : step === 'checkout' ? (
        <>
          <div className="drawer-body">
            <button className="back-link" type="button" onClick={() => { setStep('cart'); setFormError(''); }}>
              <ArrowLeft size={15} aria-hidden="true" /> Volver a la bolsa
            </button>

            <div className="checkout-summary">
              <span>{count} {count === 1 ? 'artículo' : 'artículos'}</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <form className="checkout-form" onSubmit={submit} noValidate>
              <Field id="customer-name" label="Nombre y apellido" error={errors.name}>
                <input
                  id="customer-name"
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  value={customer.name}
                  onChange={(event) => updateCustomer('name', event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'customer-name-error' : undefined}
                  placeholder="Como te llamás"
                  data-autofocus
                />
              </Field>

              <Field id="customer-phone" label="WhatsApp / teléfono" error={errors.phone}>
                <input
                  id="customer-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={30}
                  value={customer.phone}
                  onChange={(event) => updateCustomer('phone', event.target.value)}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'customer-phone-error' : undefined}
                  placeholder="Código de área + número"
                />
              </Field>

              <Field id="customer-notes" label="Nota para la entrega" error={errors.notes} optional>
                <textarea
                  id="customer-notes"
                  name="notes"
                  maxLength={300}
                  rows={3}
                  value={customer.notes}
                  onChange={(event) => updateCustomer('notes', event.target.value)}
                  placeholder="Barrio, horario o cómo coordinar"
                />
              </Field>

              <Field id="customer-modalidad" label="Modalidad" optional>
                <div className="modalidad-options">
                  <label>
                    <input
                      type="radio"
                      name="modalidad"
                      value="retiro"
                      checked={modalidad === 'retiro'}
                      onChange={() => setModalidad('retiro')}
                    />
                    Retiro en el local (barrio)
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="modalidad"
                      value="envio"
                      checked={modalidad === 'envio'}
                      onChange={() => setModalidad('envio')}
                    />
                    Envío / cadetería en Catamarca
                  </label>
                </div>
              </Field>

              <label className={`check-line ${errors.privacy ? 'check-line--error' : ''}`}>
                <input
                  type="checkbox"
                  checked={privacy}
                  onChange={(event) => {
                    setPrivacy(event.target.checked);
                    setErrors((current) => ({ ...current, privacy: undefined }));
                  }}
                  aria-invalid={Boolean(errors.privacy)}
                />
                <span>
                  Entiendo que NyS usará estos datos solo para gestionar este pedido.
                  Tu número de WhatsApp se usará únicamente para coordinar la entrega.
                </span>
              </label>
              {errors.privacy && <p className="field-error">{errors.privacy}</p>}

              {!isSupabaseConfigured && (
                <Notice tone="info">
                  Modo demostración: el pedido se guarda en este navegador y no se envía a ningún servidor.
                </Notice>
              )}
              {formError && <ErrorNote>{formError}</ErrorNote>}

              <button className="btn btn--primary btn--full" type="submit" disabled={busy}>
                {busy ? <><Spinner label="Enviando pedido" /> Enviando…</> : <>Enviar solicitud · {formatPrice(total)} <ArrowRight size={17} aria-hidden="true" /></>}
              </button>

              <p className="secure-line">
                <ShieldCheck size={14} aria-hidden="true" />
                No te pedimos datos de tarjeta. El pago se coordina aparte.
              </p>
            </form>
          </div>
        </>
      ) : (
        <>
          <div className="drawer-body">
            <ul className="cart-lines">
              {cart.map((item) => (
                <li className="cart-line" key={`${item.id}-${item.size}`}>
                  <ProductImage src={item.image_url} alt={item.name} className="cart-thumb" />
                  <div className="cart-line-copy">
                    <h3>{item.name}</h3>
                    <p>
                      {item.size !== 'Único' ? `Talle ${item.size} · ` : ''}
                      {formatPrice(item.price)}
                    </p>
                    <div className="stepper stepper--sm" role="group" aria-label={`Cantidad de ${item.name}`}>
                      <button
                        type="button"
                        onClick={() => onDecrement(item)}
                        aria-label={`Restar una unidad de ${item.name}`}
                      >
                        <Minus size={13} aria-hidden="true" />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onIncrement(item)}
                        disabled={item.quantity >= Math.min(item.stock, 10)}
                        aria-label={`Sumar una unidad de ${item.name}`}
                      >
                        <Plus size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="cart-line-side">
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                    <button className="remove-link" type="button" onClick={() => onRemove(item)}>
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-note">
              <ShieldCheck size={16} aria-hidden="true" />
              <p>
                La entrega y el pago se coordinan con NyS después de confirmar el stock.
                Podés sumar o quitar artículos antes de enviar.
              </p>
            </div>
          </div>

          <div className="drawer-foot">
            <div className="subtotal">
              <span>Subtotal</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <button className="btn btn--primary btn--full" type="button" onClick={() => { setStep('checkout'); setFormError(''); }}>
              Continuar con el pedido <ArrowRight size={17} aria-hidden="true" />
            </button>
            {cartWhatsAppUrl && (
              <a className="drawer-wa" href={cartWhatsAppUrl} target="_blank" rel="noreferrer">
                <WhatsAppIcon size={16} /> Consultar antes por WhatsApp
              </a>
            )}
            <button className="link-btn" type="button" onClick={onClose}>Seguir mirando</button>
          </div>
        </>
      )}
    </Modal>
  );
}
