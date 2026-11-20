import { isSupabaseConfigured, supabase } from './supabase.js';
import { validateImageFile } from './products.js';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.82;

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No pudimos leer la imagen.'));
    };
    image.src = url;
  });
}

async function optimizeWithCanvas(file) {
  const image = await loadImageElement(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error('La imagen no tiene dimensiones válidas.');

  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No pudimos procesar la imagen.');
  ctx.fillStyle = '#f4f4f1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/**
 * Demo mode: compress and embed the image as a data URL so it survives a reload
 * without needing external storage.
 */
export async function optimizeImageFile(file) {
  const error = validateImageFile(file);
  if (error) throw new Error(error);
  return optimizeWithCanvas(file);
}

/**
 * Production mode: upload to the public `product-images` bucket and return its URL.
 * Demo mode: return a compressed data URL.
 */
export async function uploadProductImage(file) {
  const error = validateImageFile(file);
  if (error) throw new Error(error);

  if (!isSupabaseConfigured) return optimizeWithCanvas(file);

  const extension = (file.name.split('.').pop() || 'jpg')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 5) || 'jpg';
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error('No pudimos subir la imagen. Verificá el bucket "product-images" y sus permisos (schema.sql).');
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('La imagen se subió pero no pudimos obtener su URL pública.');
  return data.publicUrl;
}
