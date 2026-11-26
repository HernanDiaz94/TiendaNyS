import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';

import { sizeHasCost } from '../lib/inventory.js';
import { getSizeStock, sortSizes } from '../lib/products.js';
import { todayInputValue } from '../lib/inventory.js';
import { Modal } from '../components/Modal.jsx';
import { ErrorNote, Notice, Spinner } from '../components/ui.jsx';

export function BulkCostForm({ open, products = [], purchases = [], onClose, onSave }) {
  const targets = useMemo(() => products.flatMap((product) => {
    const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['Único'];
    return sortSizes(sizes)
      .filter((size) => getSizeStock(product, size) > 0 && !sizeHasCost(purchases, product.id, size))
      .map((size) => ({
        productId: String(product.id),
        productName: product.name,
        size,
        stock: getSizeStock(product, size),
        cost: '',
      }));
  }), [products, purchases]);

  const [rows, setRows] = useState([]);
  const [supplier, setSupplier] = useState('');
  const [purchasedAt, setPurchasedAt] = useState(todayInputValue());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(targets);
    setSupplier('');
    setPurchasedAt(todayInputValue());
    setFormError('');
  }, [open, targets]);

  const setCost = (index, value) => {
    setRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, cost: value } : row
    )));
    setFormError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const complete = rows.every((row) => String(row.cost).trim() !== '');
    if (rows.length === 0 || !complete) {
      setFormError('Ingresá el costo unitario de todos los talles listados.');
      return;
    }
    const invalid = rows.find((row) => {
      const value = Number(row.cost);
      return !Number.isFinite(value) || value < 0 || value > 99999999;
    });
    if (invalid) {
      setFormError(`Revisá el costo de ${invalid.productName} talle ${invalid.size}.`);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        supplier,
        purchasedAt,
        rows: rows.map((row) => ({
          productId: row.productId,
          size: row.size,
          unitCost: Math.round(Number(row.cost) * 100) / 100,
        })),
      });
      onClose();
    } catch (error) {
      setFormError(error.message || 'No pudimos regularizar el stock.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="bulk-cost-title" className="form-modal">
      <form onSubmit={submit} className="form-grid">
        <div className="form-modal-header">
          <div>
            <p className="eyebrow">REGULARIZAR</p>
            <h2 id="bulk-cost-title">Cargar costos del stock existente</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <Notice tone="info">
          Se asigna el costo al stock que ya está en la tienda. No se suman unidades nuevas.
        </Notice>

        {rows.length === 0 ? (
          <p className="field-hint">No hay talles con stock pendiente de costo.</p>
        ) : (
          <>
            <div className="bulk-cost-common">
              <label>
                <span>Proveedor (opcional)</span>
                <input
                  type="text"
                  maxLength="80"
                  value={supplier}
                  onChange={(event) => setSupplier(event.target.value)}
                  placeholder="Ej. Proveedor local"
                />
              </label>
              <label>
                <span>Fecha de ingreso</span>
                <input
                  type="date"
                  value={purchasedAt}
                  onChange={(event) => setPurchasedAt(event.target.value)}
                />
              </label>
            </div>

            <div className="bulk-cost-list">
              {rows.map((row, index) => (
                <div className="bulk-cost-row" key={`${row.productId}-${row.size}`}>
                  <div>
                    <strong>{row.productName}</strong>
                    <span>Talle {row.size} · {row.stock} u.</span>
                  </div>
                  <label>
                    <span>Costo unitario</span>
                    <input
                      type="number"
                      min="0"
                      max="99999999"
                      step="0.01"
                      inputMode="decimal"
                      value={row.cost}
                      onChange={(event) => setCost(index, event.target.value)}
                      placeholder="$"
                    />
                  </label>
                </div>
              ))}
            </div>
          </>
        )}

        {formError && <ErrorNote>{formError}</ErrorNote>}

        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving || rows.length === 0}>
            {saving
              ? <><Spinner label="Guardando" /> Guardando…</>
              : <><Check size={16} aria-hidden="true" /> Regularizar {rows.length} {rows.length === 1 ? 'talle' : 'talles'}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
