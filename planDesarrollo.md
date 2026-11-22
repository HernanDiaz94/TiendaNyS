# Tienda NyS — Planificación y Registro del Proyecto

**Última actualización:** 22 de Noviembre, 2026  
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
- **Testing:** Vitest (37 tests)

---

## ✅ Funcionalidades Implementadas

### Storefront (Tienda)
- [x] Catálogo de 12 productos con fotos con estética andina (Pexels)
- [x] Filtros por categoría, talle y búsqueda
- [x] Carrito de compras (localStorage)
- [x] Modal de producto con detalles
- [x] Checkout sin DNI: solo Nombre y WhatsApp
- [x] Checkout por WhatsApp (mensaje con nombre, talle, cantidad y precio por producto)
- [x] Hero section con foto real de Valle Chico y sticker "DROP 01"
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

### Adaptaciones a Catamarca
- [x] Texto "CATAMARCA" en todo el sitio
- [x] Ubicación: San Fernando del Valle de Catamarca
- [x] Barrio: Valle Chico
- [x] Dirección: Calle 24 esquina 45, Casa 212
- [x] Horarios: 10:00 a 14:00 y de 18:00 a 22:00
- [x] WhatsApp: +54 9 3834 19-8148
- [x] Envíos: "Realizamos envíos con recargo"
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
| `src/components/Catalog.jsx` | Catálogo de productos con filtros |
| `src/components/ProductModal.jsx` | Modal de detalle de producto |
| `src/components/CartDrawer.jsx` | Carrito de compras lateral |
| `src/components/Header.jsx` | Header con búsqueda y navegación |
| `src/components/ui.jsx` | Componentes UI (ProductImage, etc.) |

### Datos
| Archivo | Descripción |
|---------|-------------|
| `src/data/demoProducts.js` | 12 productos con imágenes Pexels (estética andina) |
| `src/lib/demoStore.js` | Persistencia demo; migra fotos viejas de Unsplash y URLs reemplazadas a las nuevas |

### Admin
| Archivo | Descripción |
|---------|-------------|
| `src/admin/AdminApp.jsx` | Panel de administración |
| `src/admin/AdminLogin.jsx` | Login con usuario `admin` o correo, y registro de admins demo |
| `src/hooks/useAuth.js` | Sesión demo, login por correo/usuario y `signUp` demo |
| `src/admin/AdminPanel.jsx` | Pedidos, catálogo, stock y compras |
| `src/admin/ProductForm.jsx` | Alta y edición de artículos |
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

> Los datos demo ya guardados en `localStorage` se migran solos: `demoStore.js` reemplaza las URLs viejas de Unsplash para estos 12 artículos al cargar el catálogo.

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

> Seguridad: la publishable key (o la anon legacy) es pública y está protegida por RLS. La `service_role` / secret key **nunca** se pone en variables `VITE_*` ni en el frontend.

**Correcciones aplicadas al esquema antes de ejecutarlo:**
- Fijadas las firmas de `REVOKE` **y** `GRANT` de `place_order` (tenían 5 argumentos; la función tiene 4). Sin esto, el SQL se cortaba con `42883: function public.place_order(text, text, text, text, jsonb) does not exist` antes de crear el bucket de imágenes y `register_purchase`.
- Semilla actualizada a las 12 fotos finales de Pexels y con `purchased_at` para conservar la alerta de +6 meses en los dos artículos viejos.

---

## 📝 Historial de Commits Relevantes

| Commit | Descripción |
|--------|-------------|
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
- [ ] Agregar más productos al catálogo
- [ ] Configurar MercadoPago para pagos online
- [ ] Agregar más categorías de productos
- [x] Optimizar imágenes (WebP, srcset y lazy loading mejorado — 22/11/2026)
- [ ] Agregar SEO meta tags por producto
- [ ] Implementar búsqueda avanzada
- [ ] Agregar sistema de reviews/calificaciones
- [ ] Configurar dominio personalizado
- [ ] Agregar Google Analytics

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
npm test             # Ejecuta 37 tests

# Build
npm run build        # Genera dist/ para producción

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

## ✅ Estado actual (22 de Noviembre, 2026)

- Sitio en producción y verificado: **12/12 fotos de Pexels**, hero con imagen **Drop 01 2026** en WebP, footer con ícono de ubicación y catálogo leyendo de **Supabase** (`rest/v1/products` confirmado en el navegador). Imágenes con `srcset` + lazy loading y hero WebP (-79% vs JPG).
- **Supabase:** ref `asqfokknkuciricvbpyn`, esquema ejecutado, 12 productos semilla, RLS/funciones activas. Variables en Vercel (Production, Preview, Development). Usuario admin `hernan.diiaz@gmail.com` creado, con rol `admin` y login verificado en `/admin`.
- **Tests:** 37/37 ✔ · **Build:** OK ✔ · **Deploy:** READY ✔
- Repositorio limpio, sin cambios pendientes (`.env` no versionado).
- Todo se documenta en este archivo (`planDesarrollo.md`); **no se crean otros `.md`**.

*Documento actualizado manualmente. Última actualización: 22 de Noviembre, 2026*
