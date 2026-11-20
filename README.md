# NyS Indumentaria

Tienda online mobile-first para una marca urbana: catálogo con filtros y búsqueda, detalle de producto, bolsa sin registro, stock real y panel privado con CRUD completo. Stack: **React 19 + Vite 6 + Supabase**, lista para desplegar en Netlify.

La identidad visual es monótona y de alto contraste — negro, papel off-white, gris hormigón y un acento lima ácido (`#d6ff3f`) — con tipografía Archivo/Inter, radios de 2 px y la fotografía de producto como protagonista.

## Contenido

- [Ejecutar localmente](#ejecutar-localmente)
- [Modo demo](#modo-demo)
- [Funcionalidad de la tienda](#funcionalidad-de-la-tienda)
- [Panel de administración](#panel-de-administración)
- [Conectar Supabase](#conectar-supabase)
- [Variables de entorno](#variables-de-entorno)
- [Flujo de compra](#flujo-de-compra)
- [Publicar en Netlify](#publicar-en-netlify)
- [Seguridad y privacidad](#seguridad-y-privacidad)
- [Comandos](#comandos)

## Ejecutar localmente

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abrí la URL que muestra Vite. Sin variables de Supabase la aplicación arranca en **modo demo** y es completamente navegable: catálogo, filtros, detalle, bolsa, checkout simulado y panel admin con CRUD.

## Modo demo

Se activa automáticamente cuando faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`.

- Catálogo inicial en `src/data/demoProducts.js`; los cambios se guardan en `localStorage`.
- Pedidos y stock también viven en `localStorage`: al confirmar una compra se descuenta stock; al cancelar un pedido desde el panel se devuelve.
- El panel está en `/admin` y la contraseña por defecto es **`nys-demo`**. Se puede cambiar con `VITE_DEMO_ADMIN_PASSWORD`.
- Desde el panel demo se puede restaurar el catálogo de ejemplo.

> El modo demo **no es seguridad real**: la contraseña viaja en el JavaScript publicado y los datos son locales al navegador. Usalo para demos y pruebas, no para vender en producción.

## Funcionalidad de la tienda

- **Catálogo responsive** con imagen, nombre, precio, talles y estado de stock (`En stock`, `Últimas N`, `Agotado`).
- **Filtros por categoría y talle**, búsqueda en tiempo real y orden por destacados, precio o novedad.
- **Detalle de producto** en modal con galería, descripción, selección de talle, cantidad y consulta directa por WhatsApp.
- **Bolsa persistente** en el navegador, con control de cantidades según stock.
- **Checkout sin cuenta**: nombre, DNI, teléfono y nota de entrega; validación clara y resumen del pedido.
- **Confirmación por WhatsApp** con referencia y total (sin DNI) cuando `VITE_WHATSAPP_NUMBER` está configurado; si no, se ofrece Instagram o copiar el resumen.
- **Accesibilidad**: foco atrapado en modales, cierre con `Escape`, estados `aria-*`, soporte de teclado y `prefers-reduced-motion`.

Categorías: `Remeras`, `Camisas`, `Pantalones`, `Abrigos`, `Calzado`, `Accesorios`.

## Panel de administración

Disponible en `/admin`.

- Métricas de ventas, pedidos activos, productos publicados y stock bajo.
- Pedidos con búsqueda, filtro por estado, detalle de cliente, cambio de estado y contacto por WhatsApp.
- CRUD de productos: crear, editar y eliminar con confirmación.
- Título, descripción, precio, categoría, color, talles, stock, destacado y visibilidad.
- Carga de imagen con vista previa y compresión en el navegador.
- Ajuste rápido de stock y activación/ocultamiento desde la tabla.
- En Supabase, las operaciones quedan restringidas al rol `admin` por RLS. En demo se protege con la contraseña local.

## Conectar Supabase

1. Creá un proyecto en [Supabase](https://supabase.com).
2. En **SQL Editor**, ejecutá el contenido completo de `supabase/schema.sql`. Crea:
   - tablas `products`, `profiles`, `orders` y `order_items`;
   - políticas RLS y funciones `place_order` / `admin_update_order_status`;
   - la migración de categorías;
   - productos de ejemplo;
   - el bucket público `product-images` con lectura pública y escritura solo para admin.
3. En **Authentication → Users**, creá la cuenta de la dueña con un correo y una contraseña larga y única. Desactivá el alta pública si no la necesitás.
4. Asignale el rol admin a esa cuenta desde SQL Editor (reemplazá el correo):

   ```sql
   insert into public.profiles (user_id, role)
   select id, 'admin' from auth.users where email = 'duena@ejemplo.com'
   on conflict (user_id) do update set role = 'admin';
   ```

5. Copiá `.env.example` a `.env.local` y completá las variables. Reiniciá Vite.
6. Verificá el login en `/admin`, subí una imagen y probá una compra de punta a punta.

## Variables de entorno

Creá `.env.local` a partir de `.env.example`:

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Para producción | Project URL de Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Para producción | Publishable/anon key. Es pública; RLS protege los datos. |
| `VITE_WHATSAPP_NUMBER` | Recomendada | WhatsApp en formato internacional, solo dígitos (ej. `54911...`). |
| `VITE_MERCADOPAGO_PAYMENT_URL` | Opcional | Link de pago fijo de Mercado Pago. No genera monto ni acredita pagos automáticamente. |
| `VITE_INSTAGRAM_HANDLE` | Opcional | Usuario de Instagram sin `@`. Fallback: `nys_indumentaria_25`. |
| `VITE_DEMO_ADMIN_PASSWORD` | Solo demo | Contraseña del panel demo. Por defecto `nys-demo`. |

> Las variables `VITE_*` se incluyen en el JavaScript publicado. **Nunca** pongas `service_role`, claves secretas, tokens privados ni contraseñas reales en este proyecto del navegador.

## Flujo de compra

- El comprador no crea cuenta. Arma la bolsa, completa nombre, DNI, teléfono y una nota opcional.
- Con Supabase, la función `place_order` valida los datos, toma el precio real de la base, bloquea filas y registra el pedido como `pendiente`. El precio calculado en el navegador nunca es autoridad.
- El stock se reserva al crear el pedido. Si se cancela desde el panel, vuelve automáticamente.
- Luego se ofrece WhatsApp con referencia y total para coordinar disponibilidad, entrega y pago.
- El link de Mercado Pago es **genérico**: no crea una preferencia, no calcula el importe ni verifica el pago. Para cobros variables con acreditación automática hace falta una integración de backend/webhooks; no pongas credenciales privadas en React.

## Publicar en Netlify

1. Subí el proyecto a un repositorio Git y conectalo a Netlify.
2. `netlify.toml` ya define `npm run build`, la carpeta `dist`, el redirect de SPA y las cabeceras de seguridad (incluida CSP).
3. En **Site configuration → Environment variables**, cargá las mismas variables públicas.
4. En Supabase, actualizá **Authentication → URL Configuration** con la URL final (Site URL y Redirect URLs).
5. Redesplegá después de cambiar variables y probá una compra real de punta a punta.

La CSP permite Google Fonts, imágenes de Unsplash y Supabase (`https://*.supabase.co`). Si usás otro dominio de imágenes o un CDN propio, agregalo en `img-src` dentro de `netlify.toml`.

## Seguridad y privacidad

- RLS habilitado en todas las tablas. Visitantes solo leen productos activos y solo pueden crear pedidos mediante la función SQL validada; no pueden consultar pedidos ni DNI. Solo el rol `admin` accede a pedidos e inventario.
- Las funciones usan permisos mínimos y `search_path` fijo; validan entrada, fijan el precio desde la base y actualizan stock bajo bloqueo transaccional.
- Supabase Auth protege el panel en producción; no hay usuario/contraseña predeterminados. Usá contraseñas únicas y MFA cuando esté disponible.
- La política de escritura del bucket `product-images` exige `is_store_admin()`.
- No se recopilan datos bancarios. El DNI y el teléfono son datos personales: limitá quién accede al panel, definí cuánto tiempo conservarlos y atendé solicitudes de acceso/eliminación según la normativa aplicable.
- Antes de lanzar públicamente, agregá protección anti-bots/rate limiting al endpoint de pedidos (por ejemplo, Cloudflare Turnstile verificado del lado servidor).
- Reemplazá las imágenes de muestra de Unsplash por fotos propias o con licencia adecuada antes de vender.

## Comandos

```bash
npm run dev    # servidor de desarrollo
npm test       # pruebas unitarias (Vitest)
npm run build  # compilación de producción
npm run preview # servir la compilación localmente
```
