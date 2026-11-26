# Tienda NyS — Planificación y Registro del Proyecto

**Última actualización:** 26 de Noviembre, 2026  
**Repositorio:** https://github.com/HernanDiaz94/TiendaNyS  
**Sitio en producción:** https://tienda-nys.vercel.app/  
**Sitio anterior (pausado):** https://tienda-nys.netlify.app/

> Este es el **único documento de planificación** del proyecto. Toda decisión, cambio, commit y punto de retorno se registra acá.

---

## 📋 Resumen del Proyecto

Tienda de indumentaria urbana "NyS" adaptada para San Fernando del Valle de Catamarca.  
Estilo básico, familiar y vecinal. Tienda recién comenzada.  
Modo demo funcional con password `nys-demo` (sin Supabase conectado). También permite registrar administradores con correo (ej. Gmail); se guardan en `localStorage` bajo `nys-demo-users` (contraseñas hasheadas de forma simple, **solo demo**).

### Stack Tecnológico
- **Frontend:** React 18 + Vite 6
- **Estilos:** CSS vanilla (paleta tierra suave)
- **Backend:** Supabase (opcional, modo demo con localStorage)
- **Hosting:** Vercel (deploy automático desde GitHub)
- **Testing:** Vitest (65 tests)

---

## ✅ Funcionalidades Implementadas

### Storefront (Tienda)
- [x] Catálogo con fotos con estética andina (Pexels): 15 productos en modo demo (12 en Supabase hasta ejecutar la migración `add-audience-and-underwear.sql`)
- [x] Filtros por categoría, **público (Todos / Hombre / Mujer)**, talle y búsqueda; los artículos sin etiqueta son unisex y aparecen en Hombre y Mujer
- [x] Carrito de compras (localStorage)
- [x] Modal de producto con detalles y etiqueta de público cuando no es unisex
- [x] Guía de talles desplegable en el modal (calzado, superior, inferior, **ropa interior** y único)
- [x] Modalidad de entrega en dos tarjetas separadas: **Retiro en el local** y **Envíos dentro de Catamarca** (también en el mensaje de WhatsApp y en el checkout de la bolsa)
- [x] Checkout sin DNI: solo Nombre y WhatsApp
- [x] Checkout por WhatsApp (mensaje con nombre, talle, cantidad y precio por producto)
- [x] Hero section con foto real de Valle Chico y sticker "DROP 01" (dato de envíos: "Dentro de Catamarca")
- [x] Sección "Nosotros" (Story) con stamp "CTA EST. 2025"
- [x] Footer con dirección (ícono de ubicación), horarios separados y WhatsApp
- [x] Marquee animado
- [x] Diseño responsive

### Admin Panel
- [x] Login con usuario `admin` / clave `nys-demo` o con correo registrado
- [x] Registro de administradores con correo (Gmail u otro) en modo demo (pestaña "Registrar admin")
- [x] Aviso de modo demostración removido del login (pedido del usuario)
- [x] Gestión de productos (CRUD)
- [x] Gestión de pedidos
- [x] Upload de imágenes
- [x] Modo demo (localStorage)
- [x] Registro de compras por lote (cantidad, costo unitario, proveedor y fecha)
- [x] Las compras suman stock automáticamente y quedan en el historial
- [x] Fecha de ingreso visible en cada artículo del catálogo
- [x] Alerta y filtro de artículos con más de 6 meses en inventario
- [x] Editor de guía de talles por producto (elegí el tipo y ajustá medidas/nota)
- [x] Selector de público por producto (unisex / hombre / mujer; sin etiqueta = unisex)

### Adaptaciones a Catamarca
- [x] Texto "CATAMARCA" en todo el sitio
- [x] Ubicación: San Fernando del Valle de Catamarca
- [x] Barrio: Valle Chico
- [x] Dirección: Calle 24 esquina 45, Casa 212
- [x] Horarios: 10:00 a 14:00 y de 18:00 a 22:00
- [x] WhatsApp: +54 9 3834 19-8148
- [x] Envíos: "Realizamos envíos dentro de Catamarca con recargo"
- [x] Story stamp: "CTA EST. 2025"

---

## 📁 Archivos Clave

### Configuración
| Archivo | Descripción |
|---------|-------------|
| `.env` | Variables de entorno (WhatsApp, Instagram handle) |
| `src/config/site.js` | Configuración editable (dirección, horarios, envíos) |
| `vercel.json` | Rewrites para SPA routing (admin route) |
| `netlify.toml` | Configuración de Netlify (pausado) |
| `index.html` | Meta tag CSP para fix de errores de consola |

### Componentes
| Archivo | Descripción |
|---------|-------------|
| `src/App.jsx` | Router principal (Storefront vs Admin) |
| `src/components/Storefront.jsx` | Página principal de la tienda |
| `src/components/Hero.jsx` | Sección hero con imagen y título "Simples" |
| `src/components/Story.jsx` | Sección "Nosotros" con stamp "CTA" |
| `src/components/Footer.jsx` | Footer con dirección, horarios, WhatsApp |
| `src/components/Catalog.jsx` | Catálogo con filtros de categoría, público, talle y búsqueda |
| `src/components/ProductModal.jsx` | Modal de detalle con guía de talles y etiqueta de público |
| `src/components/CartDrawer.jsx` | Carrito de compras lateral |
| `src/components/Header.jsx` | Header con búsqueda y navegación |
| `src/components/ui.jsx` | Componentes UI (ProductImage, etc.) |

### Datos
| Archivo | Descripción |
|---------|-------------|
| `src/data/demoProducts.js` | 15 productos (12 originales + 3 de ropa interior) con fotos Pexels y guía por categoría |
| `src/lib/products.js` | Categorías, normalización de público y filtrado (unisex en Hombre y Mujer) |
| `src/lib/sizeGuides.js` | Guías genéricas (incluye `interior`), normalización y resolución por producto |
| `src/lib/demoStore.js` | Persistencia demo; migra fotos y agrega los 3 artículos nuevos sin borrar stock |

### Admin
| Archivo | Descripción |
|---------|-------------|
| `src/admin/AdminApp.jsx` | Panel de administración |
| `src/admin/AdminLogin.jsx` | Login con usuario `admin` o correo, y registro de admins demo |
| `src/hooks/useAuth.js` | Sesión demo, login por correo/usuario y `signUp` demo |
| `src/admin/AdminPanel.jsx` | Pedidos, catálogo, stock y compras |
| `src/admin/ProductForm.jsx` | Alta y edición de artículos (público, guía de talles y medidas) |
| `src/admin/PurchaseForm.jsx` | Registro de compras (lote, costo, proveedor, fecha) |
| `src/hooks/usePurchases.js` | Historial de compras (Supabase o demo) |
| `src/lib/inventory.js` | Antigüedad de stock, validación de compras y alerta de +6 meses |

---

## 🖼️ Imágenes de Productos (Pexels)

Fotos de tonos tierra, lana y cuero, con estética del noroeste argentino. URLs verificadas (200 OK):

| # | Producto | Foto Pexels | Contenido |
|---|----------|-------------|-----------|
| 1 | Campera Siena | 14330778 | Abrigo beige en escaleras |
| 2 | Remera Esencial | 6786614 | Remera blanca sobre fondo crudo |
| 3 | Mochila Urbana | 12477384 | Mochilero en ruta de cerros secos |
| 4 | Zapatillas Alba | 33353887 | Zapatilla sobre dunas de arena |
| 5 | Pantalón Nube | 14200504 | Look negro sobre dunas |
| 6 | Buzo Monte | 5789010 | Suéter de lana tostada |
| 7 | Gorra Brisa | 7562957 | Gorra cruda sobre madera |
| 8 | Sandalias Costa | 23692992 | Sandalias de cuero |
| 9 | Camisa Oliva | 17476810 | Camisa oliva |
| 10 | Tote Mercado | 17836626 | Tote de lona y cuero |
| 11 | Botitas Sur | 19750710 | Botas de cuero marrón |
| 12 | Chaleco Clara | 9904108 | Chaleco de lana crema |
| 13 | Boxer Tierra | 17459893 | Prenda de algodón sobre fondo textil (hombre) |
| 14 | Bombachón Arena | 11010391 | Ropa interior doblada sobre madera (mujer) |
| 15 | Pack Básico x3 | 11010388 | Set de tres piezas lisas (unisex) |

> Los datos demo ya guardados en `localStorage` se migran solos: `demoStore.js` reemplaza las URLs viejas de Unsplash para estos 12 artículos y agrega los 3 nuevos de ropa interior sin borrar stock, pedidos ni compras. Las tres fotos nuevas (200 OK) muestran prendas dobladas o sobre textiles, aptas para un catálogo familiar.

### Imágenes de Hero/Story

Reemplazadas por paisajes de **Catamarca, Argentina** (Pexels, uso libre):

| Componente | Foto | Descripción |
|-----------|------|-------------|
| Hero (principal) | `public/drop-01-2026.webp` (JPG original como fallback) | Imagen principal **Drop 01 2026**; se muestra completa (apaisada 1337×784) |
| Hero (detalle) | Wikimedia Commons · *Vista aérea de San Fernando del Valle de Catamarca* (dominio público) | Vista aérea del valle |
| Story (principal) | pexels-31204629 | Valle y cerros de los Andes |
| Story (detalle) | pexels-21558539 | Ruta entre cerros rojos de Fiambalá |
| `og:image` | pexels-37610517 | Laguna y picos nevados |

> La foto principal del hero es la imagen **Drop 01 2026** aportada por el usuario (archivo local `public/drop-01-2026.webp`, con `drop-01-2026.jpg` como fallback). La foto anterior de Valle Chico (Catamarca RT) se puede recuperar con `git checkout hero-valle-chico-real -- src/components/Hero.jsx`. El detalle sigue siendo una vista aérea de San Fernando del Valle (dominio público).

### Optimización de imágenes (22/11/2026)

- `src/lib/imageUrls.js` genera automáticamente un **`srcset`** con anchos 320/480/640/800/1000 (más el ancho declarado en la URL) para las fotos de Pexels. El CDN ya negocia **AVIF/WebP** con `auto=compress`, así que no se fuerza un formato.
- `ProductImage` acepta `sizes`, `srcSet` y `fallbackSrc`, y usa `fetchPriority="high"` en imágenes `eager`. El `loading="lazy"` se mantiene para el resto.
- Hero local convertido a **WebP** con `sharp`: `drop-01-2026.webp` (176 KB vs 852 KB del JPG, **-79%**), más variantes de 1000 px (108 KB) y 640 px (48 KB) para móvil. El JPG original queda como fallback.
- `index.html` precarga el WebP del hero con `imagesrcset`/`imagesizes`.
- Medido en el navegador: el hero elige la variante de 1000w en desktop y las tarjetas del catálogo bajan de 1000w a **640w**, con `sizes` y `loading="lazy"` correctos.

> **Punto de retorno:** tag `punto-retorno-imagenes` (commit `3af4321`). Para volver a todas las fotos anteriores: `git checkout punto-retorno-imagenes -- src/components/Hero.jsx src/components/Story.jsx src/data/demoProducts.js src/lib/demoStore.js index.html src/styles.css`.

---

## 🔎 SEO

### Etapa 1 — SEO base (22/11/2026)
- `public/robots.txt`: permite todo el sitio, bloquea `/admin` y apunta al sitemap.
- `index.html`: `canonical`, `og:url` y JSON-LD con `ClothingStore` (nombre, teléfono, dirección de Valle Chico e Instagram).

### Etapa 2 — SEO por producto (22/11/2026)

Cada prenda tiene su propia URL `/producto/<slug>/` (por ejemplo `/producto/botitas-sur/`).

- `src/lib/productSeo.js`: slugs sin acentos, mapa slug → producto (con sufijo de id si hay nombres repetidos), ruta canónica, imagen absoluta y JSON-LD `Product` + `Offer` (precio ARS, disponibilidad según stock, tienda como seller).
- `scripts/generate-seo.mjs`: se ejecuta como **`postbuild`** (después de `vite build`). Lee los productos activos desde Supabase con la **publishable key** (sin `service_role`) y genera `dist/producto/<slug>/index.html` partiendo del `index.html` de Vite. Si no hay Supabase, usa `demoProducts` para que el build local también funcione.
- `scripts/seoPages.js`: reemplaza título, descripción, canonical, `og:*`, `twitter:*` y el JSON-LD. El sitemap de la etapa 1 se sobrescribe con la home + 12 URLs de producto.
- `Storefront.jsx`: abrir una tarjeta hace `pushState` a la URL del producto; cerrar vuelve a `/`; el botón **atrás** del navegador cierra el modal. Al entrar directo a una URL de producto, el catálogo carga y abre automáticamente el modal. `document.title` sigue al producto.
- **Por qué HTML estático y no solo JS:** WhatsApp, Facebook, Twitter e Instagram **no ejecutan JavaScript**. Al generar el HTML en el build, el link compartido muestra foto, nombre, precio y disponibilidad reales. Google también indexa esas páginas sin depender del render del SPA.
- **Verificado en producción:** las 12 páginas devuelven 200 con `og:type=product`, JSON-LD de producto y canonical propio; `/sitemap.xml` lista 12 URLs; el modal se abre desde la URL directa sin errores de consola.
- **Aclaración:** los meta tags se actualizan en cada **deploy**. Si cambiás precio, foto o stock en el admin, hay que correr un deploy para regenerar el HTML (los datos que se ven dentro del modal sí son en vivo desde Supabase).
- **Ropa interior (26/11/2026):** al ejecutar la migración de `audience` se suman 3 productos. El catálogo en vivo los muestra de inmediato, pero el sitemap y las páginas HTML pasan de 12 a 15 URLs recién con un nuevo deploy.

---

## 📊 Analytics (22/11/2026)

Se eligió **Vercel Web Analytics** (no GA4): no necesita ID de medición, no usa cookies de terceros y se consulta directo en el dashboard del proyecto.

- Dependencia: `@vercel/analytics@2.0.1` (`npm install @vercel/analytics`).
- `src/App.jsx`: `<Analytics mode={import.meta.env.PROD ? 'production' : 'development'} />` se monta **solo en la tienda**; `/admin` queda fuera para no medir al dueño ni la sesión del panel.
- No hay que agregar variables de entorno ni scripts al `index.html`: el componente inyecta el snippet automáticamente.
- **Verificado en producción:** el navegador descarga `/_vercel/insights/script.js` (200) y envía `POST /_vercel/insights/view` (200 `OK`) con el payload del SDK (`@vercel/analytics/react` v2.0.1). El bundle deployado contiene el snippet.
- **Habilitado el 22/11/2026** en Vercel → proyecto `tienda-nys` → **Analytics → Enable Web Analytics** (plan Hobby: 50.000 eventos/mes, 30 días de historial, sin custom events). La API ya responde (`features.webAnalytics: true`, `enabledAt` presente).
- **Verificación real:** dos visitas de prueba (home y `/producto/botitas-sur/`) generaron `POST /_vercel/insights/view` con 200 `OK`. La API de consulta devolvió **`visitors: 1`, `pageviews: 2`** y el agrupado por `requestPath` separó correctamente `/` y `/producto/botitas-sur`. No hizo falta redeploy.
- **Dónde verlo:** Vercel → proyecto `tienda-nys` → pestaña **Analytics** → Web Analytics.
- Con el soporte de rutas del paquete (1.4+), se pueden filtrar visitas por `/` y por `/producto/<slug>/`.

---

## 📏 Guía de talles (actualizado 26/11/2026)

Se agregó una guía **genérica por categoría**, sin inventar medidas propias:

| Categoría | Guía | Columnas |
|-----------|------|----------|
| Calzado | `calzado` | AR, BR, US, EU y plantilla en cm (36 al 44) |
| Remeras, Camisas, Abrigos | `superior` | pecho, cintura y largo (XS a XXL) |
| Pantalones | `inferior` | cintura, cadera y largo (XS a XXL) |
| Ropa interior | `interior` | cintura, cadera y AR (XS a XXL) |
| Accesorios | `unico` | solo nota de talle único |

- En la tienda aparece como un bloque desplegable **"Guía de talles · <tipo>"** dentro del modal, entre los talles y el botón de compra. Es un `<details>`: no ocupa espacio si no se abre y la tabla tiene encabezado fijo y scroll.
- Prioridad de resolución (`src/lib/sizeGuides.js`): medidas editables guardadas en Supabase → `size_guide_key` asignado → inferencia por categoría. Si no hay categoría conocida, el bloque no se muestra.
- **Ropa interior (26/11/2026):** guía propia `interior` (cintura, cadera y AR); **no reutiliza** la de pantalones. Se aplica por categoría y también la escribe la migración nueva en los 3 artículos de ejemplo.
- En el admin, el formulario de producto tiene un selector de guía y un editor de medidas/nota con valores genéricos cargados y un botón **"Restablecer valores genéricos"**. El botón de restablecer usa copias frescas para no mutar la plantilla.
- Los datos viajan en `products.size_guide_key` (texto) y `products.size_measurements` (jsonb). Todo se sanitiza antes de renderizar: columnas y filas con límites, claves alfanuméricas y textos recortados.
- **Verificado en producción:** `/producto/botitas-sur/` muestra la guía de calzado con 9 filas y las 5 columnas esperadas. Las celdas de encabezado y datos están centradas (commit `8297300`).
- **Migración `add-size-guides.sql`:** ejecutada y verificada el 26/11/2026. La columna `size_guide_key` existe y los 12 artículos activos tienen guía asignada. El bloque quedó incorporado a `supabase/schema.sql` para instalaciones nuevas.

---

## 👥 Público y ropa interior (26/11/2026)

- **Filtro Todos / Hombre / Mujer** en el catálogo (`src/components/Catalog.jsx`). Un producto sin etiqueta (`null`, vacío o valor desconocido) se normaliza a **unisex** y aparece en **Hombre y Mujer**; en `Todos` aparece igual.
- **Etiqueta por producto** en el admin (`src/admin/ProductForm.jsx`): `Unisex (sin etiqueta)` / `Hombre` / `Mujer`. Se guarda en `products.audience` con default `unisex` y un `CHECK` que admite solo esos tres valores.
- `src/lib/products.js` centraliza `normalizeAudience`, `normalizeAudienceFilter` y el filtrado; `useCatalog` detecta si la columna existe y la omite al guardar si la migración aún no se ejecutó, para no romper el CRUD.
- **Categoría nueva `Ropa interior`** con 3 ejemplos: `Boxer Tierra` (hombre), `Bombachón Arena` (mujer) y `Pack Básico x3` (unisex). Fotos Pexels revisadas, aptas para un catálogo familiar (prendas dobladas o sobre textiles, sin modelos en ropa interior).
- **Guía propia** `interior` con columnas cintura / cadera / AR, talles XS a XXL.
- **Migración pendiente:** `supabase/add-audience-and-underwear.sql` (ASCII-only e idempotente). La ejecuta el usuario en el SQL Editor. Hasta entonces Supabase muestra 12 productos y todo se trata como unisex; el modo demo ya muestra los 15.
- **Verificado:** 65/65 tests, build y postbuild OK, deploy Ready, chips visibles en producción y sin errores de consola.

---

## 🔧 Variables de Entorno

### `.env` (local)
```
VITE_WHATSAPP_NUMBER=5493834198148
VITE_INSTAGRAM_HANDLE=nys_indumentaria_25
```

### Vercel (configurar en dashboard)
| Variable | Valor |
|----------|-------|
| `VITE_WHATSAPP_NUMBER` | `5493834198148` |
| `VITE_INSTAGRAM_HANDLE` | `nys_indumentaria_25` |
| `VITE_DEMO_ADMIN_PASSWORD` | `nys-demo` |
| `VITE_SUPABASE_URL` | `https://asqfokknkuciricvbpyn.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable key (`sb_publishable_...`). También se acepta `VITE_SUPABASE_ANON_KEY` legacy — **nunca** `service_role` |

### Conexión a Supabase (proyecto creado el 21/11/2026)

**Proyecto:** ref `asqfokknkuciricvbpyn` · https://supabase.com/dashboard/project/asqfokknkuciricvbpyn

La app ya detecta automáticamente Supabase: si `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (o la legacy `VITE_SUPABASE_ANON_KEY`) están definidos, deja de usar `localStorage` y pasa a leer/escribir en la base (`isSupabaseConfigured` en `src/lib/supabase.js`). Si se borran las variables, vuelve al modo demo.

**Estado: conectado y deployado el 21/11/2026; login admin verificado el 22/11/2026.** El esquema se ejecutó con éxito, el catálogo responde 12 productos desde `rest/v1/products` y Vercel tiene las dos variables en Production, Preview y Development. `.env` dejó de versionarse (commit `64487bd`). El usuario `hernan.diiaz@gmail.com` tiene rol `admin` y ya ingresó a `/admin`.

**Pasos para dejarlo andando:**

1. En el dashboard: **SQL Editor → New query**, pegar todo `supabase/schema.sql` y **Run**. Es idempotente: crea tablas, RLS, funciones, bucket de imágenes y el catálogo de 12 productos con las fotos de Pexels aprobadas.
2. En **Authentication → Providers**, verificar que **Email** esté habilitado. Crear el usuario admin desde **Authentication → Users → Add user** con correo (ej. Gmail) y contraseña.
3. Darle rol de administrador en **SQL Editor**:
   ```sql
   insert into public.profiles (user_id, role)
   select id, 'admin' from auth.users where email = 'TU_EMAIL@gmail.com'
   on conflict (user_id) do update set role = 'admin';
   ```
4. Copiar la **Project URL** y la **publishable key** (botón **Connect** del dashboard, o Project Settings → API Keys) en `.env` local:
   ```
   VITE_SUPABASE_URL=https://asqfokknkuciricvbpyn.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
5. Cargar las mismas dos variables en **Vercel → Settings → Environment Variables** (Production, Preview y Development) y hacer un redeploy (`vercel --prod --name tienda-nys`).
6. Probar en `/admin`: iniciar sesión con el **correo y contraseña** del usuario creado (en modo Supabase ya no aplica el usuario `admin` / clave `nys-demo`).
7. **Login por nombre de usuario (22/11/2026):** ejecutar una vez `supabase/add-username-login.sql` en el SQL Editor. Agrega `profiles.username`, el RPC `resolve_admin_username` y setea el alias **`hernan`** para `hernan.diiaz@gmail.com`. Después se puede entrar con **`hernan` + la contraseña de Supabase** (o seguir usando el correo). El RPC es `security definer`, solo devuelve el email de perfiles con `role = 'admin'` y se lo concede a `anon`/`authenticated`. El error de usuario inexistente es idéntico al de credenciales inválidas para no revelar aliases. El mismo bloque quedó incorporado a `supabase/schema.sql` para instalaciones nuevas.

> Ejecutado y verificado el 22/11/2026: el RPC responde `hernan` → `hernan.diiaz@gmail.com` (ignora mayúsculas, devuelve `null` para aliases inexistentes) y se confirmó el ingreso a `/admin` con **`hernan` + la contraseña de Supabase**. El login con correo sigue funcionando igual.

> **Migración pendiente (26/11/2026):** ejecutar una vez `supabase/add-audience-and-underwear.sql` en el SQL Editor. Agrega `products.audience` (`unisex` por defecto), habilita la categoría `Ropa interior`, etiqueta algunos artículos existentes, asigna la guía `interior` y carga 3 productos de ejemplo (`Boxer Tierra`, `Bombachón Arena`, `Pack Básico x3`). Es ASCII-only e idempotente. Hasta que se ejecute, Supabase sigue mostrando 12 productos y el filtro trata todo como unisex; el modo demo ya muestra los 15. Réplica en modo demo: `admin` / `nys-demo`.

> Seguridad: la publishable key (o la anon legacy) es pública y está protegida por RLS. La `service_role` / secret key **nunca** se pone en variables `VITE_*` ni en el frontend.

**Correcciones aplicadas al esquema antes de ejecutarlo:**
- Fijadas las firmas de `REVOKE` **y** `GRANT` de `place_order` (tenían 5 argumentos; la función tiene 4). Sin esto, el SQL se cortaba con `42883: function public.place_order(text, text, text, text, jsonb) does not exist` antes de crear el bucket de imágenes y `register_purchase`.
- Semilla actualizada a las 12 fotos finales de Pexels y con `purchased_at` para conservar la alerta de +6 meses en los dos artículos viejos.

---

## 📝 Historial de Commits Relevantes

| Commit | Descripción |
|--------|-------------|
| `cd45883` | feat(catalog): ropa interior, filtro hombre/mujer y guia de talles |
| `873a7d5` | docs: registrar hero con envios dentro de Catamarca |
| `d8824be` | fix(copy): envíos dentro de Catamarca en el hero |
| `e043789` | fix(copy): envíos dentro de Catamarca en modal y checkout |
| `50a246e` | feat(pdp): separar opciones de retiro y envío en el modal |
| `8297300` | style(size-guides): centrar celdas de la tabla de talles |
| `02c36ec` | feat(size-guides): guía de talles por categoría en la ficha del producto |
| `8740060` | feat(analytics): agregar Vercel Web Analytics a la tienda |
| `e29b58f` | feat(auth): login admin con nombre de usuario en Supabase |
| `198fcd5` | feat(seo): páginas estáticas por producto y rutas `/producto` |
| `1c1df0b` | feat(seo): agregar robots, sitemap, canonical y datos estructurados |
| `790ac4e` | fix: reparar acentos corruptos en el catálogo de Supabase |
| `e60779a` | perf: optimizar imágenes con WebP, `srcset` y lazy loading |
| `64487bd` | chore: dejar de versionar `.env` |
| `85a30e9` | fix: corregir también el `GRANT` de `place_order` en `schema.sql` |
| `4e52b7d` | fix: corregir esquema SQL y semilla de fotos para Supabase |
| `d450646` | feat: imagen Drop 01 2026 como foto principal del hero |
| `4d18cf1` | fix: quitar aviso de modo demostración en el login |
| `543d4f0` | feat: registro de administradores con correo en modo demo |
| `7e26689` | feat: ícono de ubicación en la dirección del footer |
| `9390a91` | fix: mejorar separación de dirección y horarios en el footer |
| `49ea062` | feat: foto real de Valle Chico como imagen principal del hero |
| `697d8d5` | feat: hero con paisaje de Valle Chico y vista aérea de San Fernando del Valle |
| `308bab6` | feat: fotos más catamarqueñas para mochila y zapatillas |
| `33c0d00` | feat: fotos de productos con estética andina y migración automática del demo |
| `b29df7d` | feat: paisajes de Catamarca en hero, story y og:image |
| `3af4321` | docs: actualizar plan con compras, inventario y commits recientes |
| `ef726da` | feat: registro de compras con stock, fecha de ingreso y alerta de inventario +6 meses |
| `79251d1` | fix: import directo de AdminApp (el panel no cargaba con lazy import) |
| `17fce97` | feat: quitar DNI del checkout y detallar productos en el mensaje de WhatsApp |
| `e5bb260` | fix: update vercel.json rewrite destination to /index.html |
| `5876354` | feat: add vercel.json for SPA routing (admin route) |
| `b3ca597` | fix: replace Pantalon Nube image with another working Unsplash URL |
| `c035633` | feat: add WhatsApp number, site config with address and hours, update footer |
| `168f827` | feat: change hero title from Basico to Simples |
| `cde1e08` | fix: replace broken Unsplash image URLs in Hero and Story components |
| `f7e05e7` | fix: replace broken Unsplash image URL for Pantalon Nube |
| `c035633` | feat: add WhatsApp number, site config with address and hours, update footer |
| `dbbe37d` | fix: update CSP meta tag to allow Unsplash images |
| `94cd9ed` | feat: add CSP meta tag to fix inline style/script errors |
| `133b347` | fix: add SITE import to Footer.jsx |
| `22d8091` | feat: add site config with direction, hours and update footer |
| `85cefdb` | feat: add VITE_WHATSAPP_NUMBER with provided number |
| `9c0e76a` | feat: restore Unsplash model images so they actually show in the website |
| `f23dcb9` | feat: actualizar auth con nombre de usuario y ajustes varios |
| `87d38be` | Tienda NyS: commit inicial con adaptaciones a Catamarca |

### 🏷️ Tags (puntos de retorno)

| Tag | Commit | Para qué sirve |
|-----|--------|----------------|
| `punto-retorno-imagenes` | `3af4321` | Estado anterior a **todo** el cambio de fotos (hero, story, catálogo, og:image) |
| `imagenes-final-aprobadas` | `308bab6` | Catálogo e imágenes aprobadas por el usuario |
| `hero-valle-chico` | `697d8d5` | Hero con paisaje rural del valle + vista aérea |
| `hero-valle-chico-real` | `49ea062` | Hero principal con la foto real de Valle Chico (Catamarca RT) |
| `registro-admin-demo` | `543d4f0` | Registro de administradores con correo en modo demo |

**Ejemplos de rollback:**

```bash
# Volver a las fotos originales (antes de todo el cambio)
git checkout punto-retorno-imagenes -- src/components/Hero.jsx src/components/Story.jsx \
  src/data/demoProducts.js src/lib/demoStore.js index.html src/styles.css

# Volver al catálogo aprobado, sin tocar el hero actual
git checkout imagenes-final-aprobadas -- src/data/demoProducts.js src/lib/demoStore.js

# Volver al hero anterior a la foto real
git checkout hero-valle-chico -- src/components/Hero.jsx
```

> Los tags están subidos a GitHub (`git push origin --tags`).

---

## 🐛 Problemas Resueltos

### 1. Imágenes no se veían en el sitio
- **Causa:** URLs de Unsplash rotas (404) + CSP bloqueando imágenes
- **Solución:** Reemplazar URLs rotas + agregar `img-src` al CSP meta tag
- **Archivos:** `src/data/demoProducts.js`, `src/components/Hero.jsx`, `src/components/Story.jsx`, `index.html`

### 2. Login admin con email en lugar de usuario
- **Causa:** El sistema usaba email para autenticación
- **Solución:** Cambiar a nombre de usuario `admin` / clave `nys-demo`. Después se amplió para aceptar **ambos**: usuario o correo registrado (`signIn` usa `identifier` y detecta si contiene `@`).
- **Archivos:** `src/admin/AdminLogin.jsx`, `src/hooks/useAuth.js`

### 6. Fotos viejas en localStorage al cambiar el catálogo
- **Causa:** El modo demo guarda los productos en `localStorage`; los usuarios ya tenían las URLs de Unsplash guardadas
- **Solución:** Migración automática en `demoStore.js` que reemplaza URLs viejas y también las dos fotos posteriormente corregidas (mochila y zapatillas), sin borrar stock, pedidos ni compras
- **Archivos:** `src/lib/demoStore.js`

### 7. Servidor de desarrollo sirviendo código viejo
- **Causa:** El watcher de Vite no registró cambios escritos mientras la terminal estaba colgada
- **Solución:** Reiniciar `npm run dev` y recargar con query string para evitar caché
- **Archivos:** ninguno (issues de entorno)

### 8. Panel de admin no cargaba (pantalla "Cargando panel…")
- **Causa:** Import lazy de `AdminApp`
- **Solución:** Import directo en `src/App.jsx`
- **Archivos:** `src/App.jsx`

### 3. Errores de CSP en consola
- **Causa:** Meta tag CSP bloqueaba estilos/scripts inline
- **Solución:** Agregar `unsafe-inline` y `img-src` al CSP
- **Archivos:** `index.html`, `netlify.toml`

### 4. Ruta /admin no funcionaba en Vercel
- **Causa:** SPA routing no configurado en Vercel
- **Solución:** Crear `vercel.json` con rewrites
- **Archivos:** `vercel.json`

### 5. Deploy pausado en Netlify
- **Causa:** Créditos de deploy agotados
- **Solución:** Migrar a Vercel (gratis, ilimitado)

### 9. Acentos corruptos en Supabase (`MarrÃ³n`, `PantalÃ³n`, `Ãšnico`)
- **Causa:** El `schema.sql` se copió al portapapeles con `Get-Content` sin `-Encoding UTF8`. Windows PowerShell lo decodificó como ANSI (Windows-1252) y los bytes UTF-8 se guardaron doble-codificados en la base. Afectaba a 10 de 12 productos (nombre, descripción, color y talles).
- **Solución:** `supabase/fix-encoding.sql` (ASCII-only) usa `convert_from(convert_to(valor, 'WIN1252'), 'UTF8')` solo donde detecta `chr(195)`. Verificado: 0 filas con acentos corruptos y `Botitas Sur · Marrón` correcto en API y en la web.
- **Prevención:** copiar SQL con acentos usando `Get-Content supabase\schema.sql -Raw -Encoding UTF8 | Set-Clipboard`.

---

## 🎯 Pendientes / Ideas Futuras

### 🧾 Compras e inventario (implementado)

**Cómo funciona:**
- En el panel, pestaña **Compras → Registrar compra**: elegís artículo, cantidad, costo unitario, proveedor y fecha.
- Cada compra crea un lote en `purchases`, suma stock y actualiza la fecha de ingreso.
- `products.purchased_at` guarda la fecha del stock **más antiguo** que sigue en la tienda. Si reponés un artículo que todavía tenía stock viejo, la fecha no se reinicia.
- Si un artículo tiene stock y su ingreso supera los **183 días (6 meses)**, aparece la alerta "Hay N artículos con más de 6 meses en inventario", la tarjeta del panel, el badge `+6 meses` y el filtro de catálogo.

**Migración en Supabase:** ejecutar `supabase/schema.sql` (es idempotente). Agrega:
- columna `products.purchased_at`
- tabla `purchases` (solo lectura para admin)
- función `register_purchase(...)` que registra el lote y suma stock en una transacción

### 🔜 Próximos pasos a implementar (prioridad alta)
- [x] **Mejorar formulario de la bolsa de pedido:** Eliminar campo DNI, solo pedir Nombre y Número de WhatsApp
- [x] **Detalle de productos en mensaje de WhatsApp:** El mensaje incluye nombre, talle, cantidad y precio
- [x] **Control de compra de productos en admin:** Compras vinculadas al stock (cantidad, proveedor, costo)
- [x] **Fecha de compra de producto:** Fecha de ingreso por artículo y por lote
- [x] **Alerta de inventario antiguo:** Aviso para productos con más de 6 meses en inventario

**Usuario admin Supabase (completado 22/11/2026):**
- [x] Usuario `hernan.diiaz@gmail.com` creado en **Supabase → Authentication → Users** con contraseña, rol `admin` asignado en `public.profiles` y login verificado en `/admin`. Ya no aplican las credenciales demo (`admin` / `nys-demo`) mientras Supabase esté activo.

### Otras mejoras
- [x] Conectar Supabase para persistencia real de datos (21/11/2026)
- [x] Agregar más productos al catálogo (3 de ropa interior en demo; en Supabase tras la migración — 26/11/2026)
- [ ] Configurar MercadoPago para pagos online (**sin implementar ni modificar nada hasta aprobación explícita**)
- [x] Agregar más categorías de productos (`Ropa interior` — 26/11/2026)
- [x] Optimizar imágenes (WebP, srcset y lazy loading mejorado — 22/11/2026)
- [x] SEO base + por producto (HTML estático por prenda, JSON-LD y sitemap — 22/11/2026)
- [x] Guía de talles por categoría en la ficha del producto (22/11/2026; migración ejecutada el 26/11/2026) y guía propia de ropa interior
- [x] Filtro por público Hombre/Mujer con unisex por defecto (26/11/2026)
- [ ] Implementar búsqueda avanzada
- [ ] Agregar sistema de reviews/calificaciones
- [ ] Configurar dominio personalizado
- [x] Vercel Web Analytics activo y verificado (sin cookies ni ID, solo tienda — 22/11/2026)

---

## 📞 Contacto

- **WhatsApp:** +54 9 3834 19-8148
- **Instagram:** @nys_indumentaria_25
- **Dirección:** Valle Chico, Calle 24 esquina 45, Casa 212, San Fernando del Valle de Catamarca
- **Horarios:** 10:00 a 14:00 y de 18:00 a 22:00

---

## 🛠️ Comandos Útiles

```bash
# Desarrollo local
npm run dev          # Inicia servidor en http://localhost:5173

# Testing
npm test             # Ejecuta 65 tests

# Build
npm run build        # Genera dist/ + 12 páginas SEO de producto (postbuild; 15 tras la migración de audience)

# Git
git add .
git commit -m "mensaje"
git push origin main  # Deploy automático en Vercel

# Vercel CLI
vercel --prod --name tienda-nys   # Deploy manual (producción)
vercel logs                       # Ver logs de deploy

# Tags
git tag -l                        # Listar puntos de retorno
git push origin --tags            # Subir tags a GitHub
```

---

## ✅ Estado actual (26 de Noviembre, 2026)

- Sitio en producción y verificado: catálogo leyendo de **Supabase** (`rest/v1/products`), hero **Drop 01 2026** en WebP, footer con ícono de ubicación, 12/12 fotos de Pexels originales y acentos corregidos (`Marrón`, `Pantalón`, `Único`). Imágenes con `srcset` + lazy loading; hero WebP (-79% vs JPG).
- **Ropa interior y público (nuevo):** filtro Todos / Hombre / Mujer visible en producción, 3 artículos de ejemplo en modo demo, guía `interior` propia y selector en el admin. **Pendiente:** ejecutar `supabase/add-audience-and-underwear.sql` para que Supabase pase de 12 a 15 productos y aplique las etiquetas. Hasta entonces, la tienda en vivo trata todo como unisex.
- **SEO completo:** robots, sitemap con 13 URLs (home + 12 productos), canonical y JSON-LD de tienda + una página HTML estática por prenda (`/producto/<slug>/`) con meta tags y `Product`/`Offer`. `og:description` dice "Envíos dentro de Catamarca". Con la migración y un nuevo deploy serán 16 URLs.
- **Supabase:** ref `asqfokknkuciricvbpyn`, esquema ejecutado, 12 productos semilla, RLS/funciones activas. `add-size-guides.sql` ejecutado y verificado (12/12 con guía). Variables en Vercel (Production, Preview, Development). Usuario admin `hernan.diiaz@gmail.com` con rol `admin`, login verificado con correo y alias **`hernan`**.
- **Analytics:** Vercel Web Analytics habilitado y verificado (excluye `/admin`), sin cookies ni GA4.
- **Guía de talles:** desplegable en el modal con tablas por categoría (incluye `interior`) y editor en el admin. Verificado en `/producto/botitas-sur/` (guía Calzado, 9 filas) tras el último deploy.
- **Tests:** 65/65 ✔ · **Build:** OK ✔ · **Deploy:** READY ✔ (`tienda-9c5vhv05r-hernan-d-team.vercel.app`)
- Repositorio limpio y sincronizado con `origin/main` (`.env` no versionado).
- Todo se documenta en este archivo (`planDesarrollo.md`); **no se crean otros `.md`**. MercadoPago sigue sin tocarse.

*Documento actualizado manualmente. Última actualización: 26 de Noviembre, 2026*
