import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ImagePlus, Plus, Trash2, Upload, X } from 'lucide-react';
import {
  AUDIENCE_OPTIONS,
  CATEGORIES,
  SIZE_PRESETS,
  emptyProductDraft,
  normalizeProductDraft,
  parseSizes,
  productDraftFrom,
  sortSizes,
  validateProduct,
} from '../lib/products.js';
import { sizeHasCost } from '../lib/inventory.js';
import { uploadProductImage } from '../lib/images.js';
import { SIZE_GUIDE_CHOICES, createSizeGuide } from '../lib/sizeGuides.js';
import { Modal } from '../components/Modal.jsx';
import { ErrorNote, Notice, ProductImage, Spinner } from '../components/ui.jsx';

function FormField({ id, label, error, hint, optional, children, full = false }) {
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

export function ProductForm({ open, product, purchases = [], onClose, onSave, isDemo }) {
  const isEditing = Boolean(product);
  const [draft, setDraft] = useState(emptyProductDraft);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [imageError, setImageError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customSize, setCustomSize] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setDraft(product ? productDraftFrom(product) : emptyProductDraft());
    setErrors({});
    setFormError('');
    setImageError('');
    setCustomSize('');
  }, [open, product]);

  const categoryOptions = useMemo(() => {
    const list = [...CATEGORIES];
    if (draft.category && !list.includes(draft.category)) list.push(draft.category);
    return list;
  }, [draft.category]);

  const setField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const toggleSize = (size) => {
    setDraft((current) => {
      const exists = current.sizes.includes(size);
      const sizes = exists
        ? current.sizes.filter((entry) => entry !== size)
        : [...current.sizes, size];
      const stockBySize = { ...(current.stock_by_size || {}) };
      const key = Object.keys(stockBySize).find((entry) => entry.toLowerCase() === size.toLowerCase()) ?? size;
      if (exists) delete stockBySize[key];
      else stockBySize[key] = Number(stockBySize[key]) || 0;
      return { ...current, sizes, stock_by_size: stockBySize };
    });
    setErrors((current) => ({ ...current, sizes: undefined }));
  };

  const addCustomSize = (event) => {
    event.preventDefault();
    const [clean] = parseSizes(customSize);
    if (!clean) return;
    const exists = draft.sizes.some((size) => size.toLowerCase() === clean.toLowerCase());
    if (!exists) {
      if (draft.sizes.length >= 20) {
        setErrors((current) => ({ ...current, sizes: 'Podés cargar hasta 20 talles.' }));
        return;
      }
      setDraft((current) => ({
        ...current,
        sizes: [...current.sizes, clean],
        stock_by_size: { ...(current.stock_by_size || {}), [clean]: Number(current.stock_by_size?.[clean]) || 0 },
      }));
    }
    setCustomSize('');
    setErrors((current) => ({ ...current, sizes: undefined }));
  };

  const setGuideKey = (key) => {
    setDraft((current) => ({
      ...current,
      size_guide_key: key,
      size_measurements: createSizeGuide(key),
    }));
    setErrors((current) => ({ ...current, size_guide: undefined }));
  };

  const setGuideRow = (rowIndex, field, value) => {
    setDraft((current) => {
      if (!current.size_measurements) return current;
      const rows = current.size_measurements.rows.map((row, index) => (
        index === rowIndex
          ? field === 'size'
            ? { ...row, size: value }
            : { ...row, values: { ...row.values, [field]: value } }
          : row
      ));
      return { ...current, size_measurements: { ...current.size_measurements, rows } };
    });
  };

  const setGuideNote = (note) => {
    setDraft((current) => (
      current.size_measurements
        ? { ...current, size_measurements: { ...current.size_measurements, note } }
        : current
    ));
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setImageError('');
    try {
      const url = await uploadProductImage(file);
      setDraft((current) => ({ ...current, image_url: url }));
      setErrors((current) => ({ ...current, image_url: undefined }));
    } catch (error) {
      setImageError(error.message || 'No pudimos procesar la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event, publish = false) => {
    event?.preventDefault();
    setFormError('');

    const values = publish ? { ...draft, is_active: true } : draft;
    const validation = validateProduct(values, {
      allowDataImages: isDemo,
      maxImageLength: isDemo ? 900000 : 500,
      allowDraftPrice: !publish,
    });
    setErrors(validation);

    const firstError = Object.keys(validation)[0];
    if (firstError) {
      document.getElementById(`product-${firstError}`)?.focus();
      return;
    }

    if (publish && missingCostSizes.length > 0) {
      setFormError(`Cargá una compra con costo para los talles: ${missingCostSizes.join(', ')}.`);
      return;
    }

    setSaving(true);
    try {
      await onSave(normalizeProductDraft(values));
    } catch (error) {
      setFormError(error.message || 'No pudimos guardar el artículo.');
    } finally {
      setSaving(false);
    }
  };

  const sortedPresets = sortSizes([...SIZE_PRESETS, ...draft.sizes]);
  const stockBySize = draft.stock_by_size || {};
  const sizesWithStock = draft.sizes.filter((size) => Number(stockBySize[size]) > 0);
  const missingCostSizes = sizesWithStock.filter(
    (size) => !sizeHasCost(purchases, product?.id, size),
  );
  const canPublish = Boolean(isEditing) && sizesWithStock.length > 0 && missingCostSizes.length === 0;
  const previewUrl = draft.image_url;

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="product-form-title"
      className="form-modal"
      overlayClassName="overlay--center"
    >
      <div className="form-head">
        <div>
          <p className="eyebrow">{isEditing ? 'EDITAR ARTÍCULO' : 'NUEVO ARTÍCULO'}</p>
          <h2 id="product-form-title">{isEditing ? draft.name || 'Editar prenda' : 'Sumá una prenda'}</h2>
        </div>
        <button className="modal-close modal-close--static" type="button" onClick={onClose} aria-label="Cerrar formulario">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <form className="product-form" onSubmit={submit} noValidate>
        <div className="form-scroll">
          <div className="form-grid">
            <FormField
              id="product-name"
              label="Nombre"
              error={errors.name}
              full
            >
              <input
                id="product-name"
                maxLength={100}
                value={draft.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="Ej: Buzo Oversize Negro"
                aria-invalid={Boolean(errors.name)}
                data-autofocus
              />
            </FormField>

            <FormField
              id="product-description"
              label="Descripción"
              error={errors.description}
              hint={`${draft.description.length}/500 caracteres`}
              optional
              full
            >
              <textarea
                id="product-description"
                maxLength={500}
                rows={3}
                value={draft.description}
                onChange={(event) => setField('description', event.target.value)}
                placeholder="Material, calce, detalles que valga la pena contar."
              />
            </FormField>

            <FormField id="product-category" label="Categoría" error={errors.category}>
              <select
                id="product-category"
                value={draft.category}
                onChange={(event) => setField('category', event.target.value)}
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </FormField>

            <FormField
              id="product-audience"
              label="Público"
              error={errors.audience}
              hint="Sin etiqueta se muestra como unisex y aparece en Hombre y Mujer."
            >
              <select
                id="product-audience"
                value={draft.audience}
                onChange={(event) => setField('audience', event.target.value)}
                aria-invalid={Boolean(errors.audience)}
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FormField>

            <FormField id="product-color" label="Color" error={errors.color} optional>
              <input
                id="product-color"
                maxLength={40}
                value={draft.color}
                onChange={(event) => setField('color', event.target.value)}
                placeholder="Ej: Negro"
              />
            </FormField>

            <FormField id="product-price" label="Precio en ARS" error={errors.price}>
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={draft.price}
                onChange={(event) => setField('price', event.target.value)}
                placeholder="24900"
              />
            </FormField>

            <FormField
              id="product-stock_by_size"
              label="Stock por talle"
              error={errors.stock_by_size}
              hint="El stock sale de las compras registradas. Ajustalo solo para corregir el inventario actual."
              full
            >
              <div className="size-stock-grid">
                {draft.sizes.map((size) => {
                  const key = Object.keys(stockBySize).find((entry) => entry.toLowerCase() === size.toLowerCase()) ?? size;
                  return (
                    <label key={size} htmlFor={`stock-${size}`}>
                      <span>{size}</span>
                      <input
                        id={`stock-${size}`}
                        type="number"
                        min="0"
                        max="9999"
                        step="1"
                        inputMode="numeric"
                        value={stockBySize[key] ?? 0}
                        onChange={(event) => setField('stock_by_size', {
                          ...stockBySize,
                          [key]: event.target.value,
                        })}
                      />
                    </label>
                  );
                })}
              </div>
            </FormField>

            <FormField id="product-sizes" label="Talles" error={errors.sizes} full>
              <div className="size-picker">
                {sortedPresets.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={draft.sizes.includes(size) ? 'selected' : ''}
                    aria-pressed={draft.sizes.includes(size)}
                    onClick={() => toggleSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="custom-size">
                <input
                  id="product-sizes"
                  value={customSize}
                  maxLength={20}
                  onChange={(event) => setCustomSize(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addCustomSize(event);
                  }}
                  placeholder="Otro talle (ej: 46)"
                  aria-label="Agregar un talle personalizado"
                />
                <button type="button" className="btn btn--ghost btn--sm" onClick={addCustomSize}>
                  <Plus size={14} aria-hidden="true" /> Sumar
                </button>
              </div>
              {draft.sizes.length > 0 && (
                <p className="field-hint">Seleccionados: {draft.sizes.join(' · ')}</p>
              )}
            </FormField>

            <FormField
              id="product-size_guide"
              label="Guía de talles"
              error={errors.size_guide}
              hint="Se muestra desplegada en la ficha del producto. Podés ajustar los valores después."
              optional
              full
            >
              <select
                id="product-size_guide"
                value={draft.size_guide_key}
                onChange={(event) => setGuideKey(event.target.value)}
                aria-invalid={Boolean(errors.size_guide)}
              >
                {SIZE_GUIDE_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>{choice.label}</option>
                ))}
              </select>

              {draft.size_measurements && (
                <details className="size-guide-editor">
                  <summary>Editar medidas y nota</summary>
                  {draft.size_measurements.rows.length > 0 ? (
                    <div className="size-guide-editor-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">Talle</th>
                            {draft.size_measurements.columns.map((column) => (
                              <th scope="col" key={column.key}>{column.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {draft.size_measurements.rows.map((row, rowIndex) => (
                            <tr key={`${row.size}-${rowIndex}`}>
                              <td>
                                <input
                                  aria-label={`Talle fila ${rowIndex + 1}`}
                                  maxLength={12}
                                  value={row.size}
                                  onChange={(event) => setGuideRow(rowIndex, 'size', event.target.value)}
                                />
                              </td>
                              {draft.size_measurements.columns.map((column) => (
                                <td key={column.key}>
                                  <input
                                    aria-label={`${column.label} talle ${row.size}`}
                                    maxLength={30}
                                    value={row.values[column.key] || ''}
                                    onChange={(event) => setGuideRow(rowIndex, column.key, event.target.value)}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="field-hint">Esta guía no tiene tabla: solo se muestra la nota.</p>
                  )}
                  <label className="size-guide-editor-note">
                    <span>Nota</span>
                    <textarea
                      maxLength={240}
                      rows={2}
                      value={draft.size_measurements.note}
                      onChange={(event) => setGuideNote(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setField('size_measurements', createSizeGuide(draft.size_guide_key))}
                  >
                    Restablecer valores genéricos
                  </button>
                </details>
              )}
            </FormField>

            <div className="field field--full">
              <span className="field-label">Imagen</span>
              <div className="image-editor">
                <div className="image-preview">
                  <ProductImage src={previewUrl} alt="Vista previa del artículo" />
                </div>
                <div className="image-editor-controls">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                    onChange={handleFile}
                    hidden
                  />
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Spinner label="Subiendo imagen" /> : <Upload size={15} aria-hidden="true" />}
                    {uploading ? 'Procesando…' : 'Subir archivo'}
                  </button>
                  {previewUrl && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm btn--danger"
                      onClick={() => setField('image_url', '')}
                    >
                      <Trash2 size={15} aria-hidden="true" /> Quitar
                    </button>
                  )}
                  <p className="field-hint">
                    {isDemo
                      ? 'Modo demo: la imagen se comprime y se guarda en este navegador.'
                      : 'Se sube al bucket público “product-images” de Supabase.'}
                  </p>
                </div>
              </div>

              <FormField
                id="product-image_url"
                label="O pegá una URL"
                error={errors.image_url}
                optional
                full
              >
                <input
                  id="product-image_url"
                  type="url"
                  maxLength={isDemo ? 900000 : 500}
                  value={draft.image_url.startsWith('data:') ? '' : draft.image_url}
                  onChange={(event) => setField('image_url', event.target.value)}
                  placeholder="https://…"
                  aria-invalid={Boolean(errors.image_url)}
                />
              </FormField>

              {imageError && <p className="field-error">{imageError}</p>}
              {previewUrl.startsWith('data:') && (
                <p className="field-hint"><ImagePlus size={13} aria-hidden="true" /> Imagen cargada desde tu dispositivo.</p>
              )}
            </div>

            <div className="field field--full">
              <div className="toggle-grid">
                <label className="check-line">
                  <input
                    type="checkbox"
                    checked={draft.featured}
                    onChange={(event) => setField('featured', event.target.checked)}
                  />
                  <span><strong>Destacado</strong> Aparece primero en el catálogo.</span>
                </label>
                <p className="field-hint">
                  Estado: <strong>{draft.is_active ? 'Publicado' : 'Borrador'}</strong>.
                  {' '}Se publica cuando cada talle con stock tiene su compra con costo.
                </p>
              </div>
            </div>
          </div>

          {formError && <ErrorNote>{formError}</ErrorNote>}
          {missingCostSizes.length > 0 && sizesWithStock.length > 0 && (
            <Notice tone="info">
              Sin costo en: {missingCostSizes.join(', ')}. Registrá la compra de esos talles antes de publicar.
            </Notice>
          )}
          {isDemo && (
            <Notice tone="info">
              Los cambios se guardan en este navegador. Conectá Supabase para publicarlos online.
            </Notice>
          )}
        </div>

        <div className="form-foot">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--ghost" disabled={saving || uploading}>
            {saving
              ? <><Spinner label="Guardando" /> Guardando…</>
              : <><Check size={16} aria-hidden="true" /> {isEditing ? 'Guardar cambios' : 'Guardar borrador'}</>}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={(event) => submit(event, true)}
            disabled={saving || uploading || !canPublish}
            title={canPublish ? 'Publicar en el catálogo' : 'Primero guardá el borrador y cargá la compra con costo por talle'}
          >
            Publicar
          </button>
        </div>
      </form>
    </Modal>
  );
}
