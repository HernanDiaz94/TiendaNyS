# Tienda NyS — Registro del Proyecto

**Última actualización:** 20 de Noviembre, 2026  
**Repositorio:** https://github.com/HernanDiaz94/TiendaNyS  
**Sitio en producción:** https://tienda-nys.vercel.app/  
**Sitio anterior (pausado):** https://tienda-nys.netlify.app/

---

## 📋 Resumen del Proyecto

Tienda de indumentaria urbana "NyS" adaptada para San Fernando del Valle de Catamarca.  
Estilo básico, familiar y vecinal. Tienda recién comenzada.  
Modo demo funcional con password `nys-demo` (sin Supabase conectado).

### Stack Tecnológico
- **Frontend:** React 18 + Vite 6
- **Estilos:** CSS vanilla (paleta tierra suave)
- **Backend:** Supabase (opcional, modo demo con localStorage)
- **Hosting:** Vercel (deploy automático desde GitHub)
- **Testing:** Vitest (25 tests)

---

## ✅ Funcionalidades Implementadas

### Storefront (Tienda)
- [x] Catálogo de 12 productos con fotos de modelos (Unsplash)
- [x] Filtros por categoría, talle y búsqueda
- [x] Carrito de compras (localStorage)
- [x] Modal de producto con detalles
- [x] Checkout por WhatsApp (mensaje automático con pedido)
- [x] Hero section con imagen y sticker "DROP 01"
- [x] Sección "Nosotros" (Story) con stamp "CTA EST. 2025"
- [x] Footer con dirección, horarios y WhatsApp
- [x] Marquee animado
- [x] Diseño responsive

### Admin Panel
- [x] Login con usuario `admin` / clave `nys-demo`
- [x] Gestión de productos (CRUD)
- [x] Gestión de pedidos
- [x] Upload de imágenes
- [x] Modo demo (localStorage)

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
| `src/data/demoProducts.js` | 12 productos con imágenes Unsplash de modelo |

### Admin
| Archivo | Descripción |
|---------|-------------|
| `src/admin/AdminApp.jsx` | Panel de administración |
| `src/admin/AdminLogin.jsx` | Login con usuario `admin` |
| `src/hooks/useAuth.js` | Validación de credenciales demo |

---

## 🖼️ Imágenes de Productos (Unsplash)

Todas las URLs verificadas (200 OK):

| # | Producto | URL Unsplash |
|---|----------|-------------|
| 1 | Campera Siena | photo-1548126032-079a0fb0099d |
| 2 | Remera Esencial | photo-1521572163474-6864f9cf17ab |
| 3 | Mochila Urbana | photo-1553062407-98eeb64c6a62 |
| 4 | Zapatillas Alba | photo-1542291026-7eec264c27ff |
| 5 | Pantalón Nube | photo-1541099649105-f69ad21f3246 |
| 6 | Buzo Monte | photo-1556821840-3a63f95609a7 |
| 7 | Gorra Brisa | photo-1588850561407-ed78c282e89b |
| 8 | Sandalias Costa | photo-1603487742131-4160ec999306 |
| 9 | Camisa Oliva | photo-1598033129183-c4f50c736f10 |
| 10 | Tote Mercado | photo-1590874103328-eac38a683ce7 |
| 11 | Botitas Sur | photo-1543163521-1bf539c55dd2 |
| 12 | Chaleco Clara | photo-1591047139829-d91aecb6caea |

### Imágenes de Hero/Story

| Componente | URL Unsplash |
|-----------|-------------|
| Hero (principal) | photo-1441986300917-64674bd600d8 |
| Hero (detalle) | photo-1556905055-8f358a7a47b2 |
| Story (principal) | photo-1515886657613-9f3515b0c78f |
| Story (detalle) | photo-1503342217505-b0a15ec3261c |

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

---

## 📝 Historial de Commits Relevantes

| Commit | Descripción |
|--------|-------------|
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

---

## 🐛 Problemas Resueltos

### 1. Imágenes no se veían en el sitio
- **Causa:** URLs de Unsplash rotas (404) + CSP bloqueando imágenes
- **Solución:** Reemplazar URLs rotas + agregar `img-src` al CSP meta tag
- **Archivos:** `src/data/demoProducts.js`, `src/components/Hero.jsx`, `src/components/Story.jsx`, `index.html`

### 2. Login admin con email en lugar de usuario
- **Causa:** El sistema usaba email para autenticación
- **Solución:** Cambiar a nombre de usuario `admin` / clave `nys-demo`
- **Archivos:** `src/admin/AdminLogin.jsx`, `src/hooks/useAuth.js`

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

---

## 🎯 Pendientes / Ideas Futuras

### 🔜 Próximos pasos a implementar (prioridad alta)
- [ ] **Mejorar formulario de la bolsa de pedido:** Eliminar campo DNI, solo pedir Nombre y Número de WhatsApp
- [ ] **Detalle de productos en mensaje de WhatsApp:** El mensaje debe incluir información detallada de cada producto (nombre, talle, cantidad, precio unitario y subtotal)

### Otras mejoras
- [ ] Conectar Supabase para persistencia real de datos
- [ ] Agregar más productos al catálogo
- [ ] Configurar MercadoPago para pagos online
- [ ] Agregar más categorías de productos
- [ ] Optimizar imágenes (WebP, lazy loading mejorado)
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
npm test             # Ejecuta 25 tests

# Build
npm run build        # Genera dist/ para producción

# Git
git add .
git commit -m "mensaje"
git push origin main  # Deploy automático en Vercel

# Vercel CLI
vercel --prod        # Deploy manual
vercel logs          # Ver logs de deploy
```

---

*Documento generado automáticamente. Última actualización: 20 de Noviembre, 2026*
