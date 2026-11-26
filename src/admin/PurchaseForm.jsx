import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  emptyPurchaseDraft,
  normalizePurchase,
  validatePurchase,
} from '../lib/inventory.js';
import { formatPrice } from '../lib/shop.js';
import { Modal } from '../components/Modal.jsx';
import { ErrorNote, Notice, Spinner } from '../components/ui.jsx';

function Field({ id, label, error, hint, optional, full = false, children }) {
  return (
    <div className={`field ${error ? 'field--error' : ''} ${full ? 'field--full' : ''}`}>
      <label htmlFor={id}>
        {label} {optional && <span className="optional">(opcional)</span>}
      </label>
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

export function PurchaseForm({ open, products = [], initialProductId = '', onClose, onSave, isDemo }) {
  const [draft, setDraft] = useState(() => emptyPurchaseDraft(initialProductId));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial = products.find((product) => String(product.id) === String(initialProductId));
    setDraft(emptyPurchaseDraft(initialProductId, initial?.sizes || ['Único']));
    setErrors({});
    setFormError('');
  }, [open, initialProductId, products]);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => String(a.name).localeCompare(String(b.name), 'es')),
    [products],
  );

  const selected = sortedProducts.find((product) => String(product.id) === String(draft.productId));

  const quantity = Math.trunc(Number(draft.quantity));
  const rawCost = draft.unitCost === '' ? null : Number(draft.unitCost);
  const total = rawCost !== null && Number.isFinite(rawCost) && quantity > 0
    ? rawCost * quantity
    : null;

  const setField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');

    const validation = validatePurchase(draft);
    setErrors(validation);

    const firstError = Object.keys(validation)[0];
    if (firstError) {
      document.getElementById(`purchase-${firstError}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      await onSave(normalizePurchase(draft));
    } catch (error) {
      setFormError(error.message || 'No pudimos registrar la compra.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="purchase-form-title"
      className="form-modal purchase-modal"
      overlayClassName="overlay--center"
    >
      <div className="form-head">
        <div>
          <p className="eyebrow">INGRESO DE MERCADERÍA</p>
          <h2 id="purchase-form-title">Registrar compra</h2>
        </div>
        <button className="modal-close modal-close--static" type="button" onClick={onClose} aria-label="Cerrar formulario">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <form className="product-form" onSubmit={submit} noValidate>
        <div className="form-scroll">
          <div className="form-grid">
            <Field id="purchase-productId" label="Artículo" error={errors.productId} full>
              <select
                id="purchase-productId"
                value={draft.productId}
                onChange={(event) => {
                  const productId = event.target.value;
                  const product = products.find((entry) => String(entry.id) === String(productId));
                  setDraft((current) => ({
                    ...current,
                    productId,
                    size: String(product?.sizes?.[0] || 'Único'),
                  }));
                  setErrors((current) => ({ ...current, productId: undefined, size: undefined }));
                }}
                aria-invalid={Boolean(errors.productId)}
                data-autofocus
              >
                <option value="">Elegí un artículo…</option>
                {sortedProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}{product.color ? ` · ${product.color}` : ''} (stock {product.stock})
                  </option>
                ))}
              </select>
              {selected && (
                <p className="field-hint">
                  Stock actual: {selected.stock}. La compra suma unidades al talle elegido.
                </p>
              )}
            </Field>

            <Field id="purchase-size" label="Talle" error={errors.size}>
              <select
                id="purchase-size"
                value={draft.size}
                onChange={(event) => setField('size', event.target.value)}
                aria-invalid={Boolean(errors.size)}
              >
                {(selected?.sizes?.length ? selected.sizes : ['Único']).map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </Field>

            <Field id="purchase-quantity" label="Cantidad comprada" error={errors.quantity}>
              <input
                id="purchase-quantity"
                type="number"
                min="1"
                max="9999"
                step="1"
                inputMode="numeric"
                value={draft.quantity}
                onChange={(event) => setField('quantity', event.target.value)}
                aria-invalid={Boolean(errors.quantity)}
              />
            </Field>

            <Field id="purchase-purchasedAt" label="Fecha de compra" error={errors.purchasedAt}>
              <input
                id="purchase-purchasedAt"
                type="date"
                value={draft.purchasedAt}
                onChange={(event) => setField('purchasedAt', event.target.value)}
                aria-invalid={Boolean(errors.purchasedAt)}
              />
            </Field>

            <Field
              id="purchase-unitCost"
              label="Costo unitario en ARS"
              error={errors.unitCost}
              hint="Obligatorio: sin costo no se puede publicar el artículo."
            >
              <input
                id="purchase-unitCost"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={draft.unitCost}
                onChange={(event) => setField('unitCost', event.target.value)}
                placeholder="Ej: 12500"
                aria-invalid={Boolean(errors.unitCost)}
              />
            </Field>

            <Field
              id="purchase-supplier"
              label="Proveedor"
              error={errors.supplier}
              hint="Dónde o a quién le compraste este lote."
              optional
            >
              <input
                id="purchase-supplier"
                maxLength={80}
                value={draft.supplier}
                onChange={(event) => setField('supplier', event.target.value)}
                placeholder="Ej: Distribuidora Norte"
                aria-invalid={Boolean(errors.supplier)}
              />
            </Field>

            {total !== null && (
              <div className="purchase-total-preview field--full">
                <span>Costo total del lote</span>
                <strong>{formatPrice(total)}</strong>
              </div>
            )}
          </div>

          {formError && <ErrorNote>{formError}</ErrorNote>}
          {isDemo && (
            <Notice tone="info">
              La compra se guarda en este navegador y suma stock al catálogo de demostración.
            </Notice>
          )}
        </div>

        <div className="form-foot">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving
              ? <><Spinner label="Registrando" /> Registrando…</>
              : <><Check size={16} aria-hidden="true" /> Registrar compra</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
