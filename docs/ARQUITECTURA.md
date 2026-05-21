# Arquitectura del Sistema — CGS Paraguay

> Documento de referencia técnica. Versión 1.1 — Mayo 2026.
> Autores: Santiago (Arquitecto), Sofía (Estrategia de automatización).
> Esta es la fuente de verdad para todas las decisiones técnicas futuras.

## ⚡ Estado actual (resumen ejecutivo)

| Capa | Implementado | Pendiente |
|------|-------------|-----------|
| Landing pública | ✅ Catálogo, guía de selección, contacto WA | — |
| Panel admin | ✅ Productos, Vehículos, Vendedores, Clientes, Pedidos (read-only), Configuración | — |
| Bot WhatsApp | ✅ Búsqueda + Guía + Ventas + Pedidos | ⏳ Testing end-to-end, FASE 3 (notificaciones) |
| Supabase DB | ✅ 8 migraciones SQL aplicadas (productos, vendedores, vehículos, clientes, pedidos, sales) | — |
| Automatizaciones n8n | ✅ WF-01 (nuevo producto), WF-02 (post semanal) | ⏳ WF-03 leads, WF-04 alertas, WF-05 fechas |

**Comandos del bot disponibles**: `/catalogo`, `/buscar`, `/guia`, `/[ID]`,
`/auto`/`moto`/`camion`/`otros`, `/destacados`, `/vender` (+ atajos +
multi-venta), `/pedido` (+ atajos + alta de cliente on-the-fly),
`/mispedidos`, `/ventas` (hoy/semana), `/ranking`, `/ayuda`, `/salir`.

---

## Tabla de contenidos

1. [Visión general del sistema](#1-vision-general-del-sistema)
2. [Arquitectura por capa](#2-arquitectura-por-capa)
3. [Modelos de datos](#3-modelos-de-datos)
4. [Flujos de datos](#4-flujos-de-datos)
5. [Decisiones arquitectónicas (ADRs)](#5-decisiones-arquitectonicas-adrs)
6. [Gaps y deuda técnica](#6-gaps-y-deuda-tecnica)
7. [Hoja de ruta técnica](#7-hoja-de-ruta-tecnica)

---

## 1. Visión general del sistema

CGS Paraguay es el sistema digital de un distribuidor oficial de lubricantes YPF. Está compuesto por tres subsistemas que comparten una única base de datos en Supabase.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USUARIOS FINALES                                   │
│                                                                              │
│   Compradores / Visitantes         Vendedores internos                       │
│   (browser público)                (WhatsApp)                                │
└───────────────┬────────────────────────────┬────────────────────────────────┘
                │                            │
                ▼                            ▼
┌───────────────────────┐        ┌───────────────────────┐
│   cgs-landing         │        │   cgs-bot             │
│   (Netlify — static)  │        │   (Railway — Node.js) │
│                       │        │                       │
│  index.html           │        │  index.js             │
│  admin.html           │        │  commands.js          │
│  js/app.js            │        │                       │
│  js/admin.js          │        │  Baileys v7           │
│  js/data.js           │        │  (WA Web no oficial)  │
└───────────┬───────────┘        └───────────┬───────────┘
            │ REST (anon key)                │ REST (service_role key)
            │ Supabase JS CDN                │ @supabase/supabase-js
            │                                │
            └──────────────┬─────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │       SUPABASE               │
            │   PostgreSQL                 │
            │                              │
            │   products       (RLS)       │
            │   vehicle_guide  (RLS)       │
            │   vendedores     (RLS)       │
            │   clientes       (RLS)       │
            │   pedidos        (RLS)       │
            │   pedido_items   (RLS)       │
            │   sales          (RLS)       │
            │   auth.users                 │
            │                              │
            │   Extensions: pg_trgm,       │
            │               unaccent       │
            │   RPCs: search_*_fuzzy,      │
            │         crear_pedido         │
            │                              │
            │   Webhooks (INSERT/UPDATE)   │
            └──────────────┬───────────────┘
                           │ HTTP POST
                           ▼
            ┌──────────────────────────────┐
            │       n8n Cloud              │
            │   (free tier — 5 workflows)  │
            │                              │
            │   WF-01: nuevo-producto      │
            │   WF-02: post-semanal        │
            │   WF-03: leads (pendiente)   │
            │   WF-04: alerta imagen       │
            │   WF-05: fechas clave        │
            └──────┬──────────────┬────────┘
                   │              │
                   ▼              ▼
         ┌──────────────┐  ┌──────────────┐
         │  Facebook    │  │  Instagram   │
         │  Page        │  │  Business    │
         │  Graph API   │  │  Graph API   │
         └──────────────┘  └──────────────┘
```

### Componentes y responsabilidades

| Componente | Tipo | Hosting | Responsabilidad |
|---|---|---|---|
| cgs-landing (landing) | Static HTML/JS/CSS | Netlify | Catálogo público, guía de selección, CTA WhatsApp |
| cgs-landing (admin) | Static HTML/JS/CSS | Netlify | CRUD de productos, registro de ventas manual, config WA |
| cgs-bot | Node.js ESM | Railway | Comandos WhatsApp para vendedores, registro de ventas |
| Supabase | BaaS (PaaS) | Supabase Cloud | Base de datos, auth, webhooks |
| n8n Cloud | iPaaS | n8n.cloud | Automatizaciones hacia redes sociales y Google Sheets |
| Meta Graph API | API externa | Meta | Publicaciones en Facebook Page e Instagram Business |

---

## 2. Arquitectura por capa

### 2.1 Capa de presentación

**Landing pública** (`index.html` + `js/app.js`)

- HTML5 semántico. Sin framework. Sin build tool (excepción: `build.js` solo inyecta credenciales).
- CSS3 con variables custom. Sin preprocesador.
- JS ES6 vanilla con módulo IIFE (`CGS` namespace en `data.js`).
- Fuente de datos: lee desde `localStorage` (cache de Supabase). Nunca llama directamente a Supabase desde `app.js` — todo pasa por `CGS.*`.
- CTA WhatsApp: número y mensaje configurables via admin, persistidos en `localStorage` bajo la clave `cgs_config`.

**Panel admin** (`admin.html` + `js/admin.js`)

- Misma arquitectura que la landing. Protected via auth gate en DOMContentLoaded.
- Tab layout: Productos / Ventas (stub) / Configuración WhatsApp.
- Estadísticas de catálogo calculadas en cliente desde el array en memoria (sin query a Supabase).

**Bot WhatsApp** (`cgs-bot/`)

- Node.js v26 ESM. Sin HTTP server propio.
- Interfaz: mensajes entrantes en WhatsApp → texto → switch de comandos → respuesta de texto.
- No hay UI. El "frontend" es la conversación de WhatsApp.

### 2.2 Capa de lógica de negocio

**js/data.js — módulo CGS**

El módulo más crítico del sistema. Centraliza todo acceso a datos para los clientes web. Patrón: singleton IIFE que expone la API pública.

```
CGS.init()        → sincroniza desde Supabase a localStorage (o carga DEFAULTS)
CGS.getAll()      → lee desde localStorage (siempre síncrono)
CGS.getById(id)   → idem
CGS.add(p)        → inserta en Supabase + re-sync a localStorage
CGS.update(id,p)  → actualiza en Supabase + re-sync a localStorage
CGS.remove(id)    → borra en Supabase + re-sync a localStorage
CGS.reset()       → restaura DEFAULTS en Supabase + re-sync
CGS.signIn(e,p)   → Supabase Auth o null si no configurado
CGS.signOut()     → Supabase Auth signOut
CGS.getSession()  → devuelve sesión activa o null
```

Fallback offline-first: si Supabase no está disponible, opera con localStorage. Si localStorage está vacío o version mismatch, carga los 19 DEFAULTS hardcodeados.

**commands.js — router del bot**

Switch de comandos sobre texto plano. Cada comando es una función async que recibe `(args, supabase)`. Búsqueda de productos: normalización NFD + scoring numérico (exacto=100, incluye=80, viscosidad=70, multi-palabra=75).

### 2.3 Capa de datos

Ver sección 3 completa. Resumen:

- Supabase PostgreSQL en region us-east-1 (Supabase default).
- Dos tablas operativas: `products` y `sales`.
- RLS habilitado. Anon: SELECT en `products`. Auth: ALL en ambas. Service_role bypasa RLS (usado por el bot y n8n).
- Auth manejada por Supabase (`auth.users`). Un usuario admin configurado manualmente.

### 2.4 Capa de integraciones externas

Diseñada y documentada por Sofía (@growth):

**n8n Cloud (iPaaS)**

- Free tier: 5 workflows activos, ~5 ejecuciones/mes incluidas (model 2025; verificar límites actuales en n8n.cloud).
- Actúa como middleware entre Supabase y las APIs de redes sociales.
- Trigger types: Supabase Webhook (HTTP POST) y Schedule (cron).
- Variables de entorno en n8n: `FACEBOOK_PAGE_ID`, `INSTAGRAM_ACCOUNT_ID`, `META_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.

**Meta Graph API v19.0**

- Facebook: `POST /PAGE_ID/photos` (con imagen) o `POST /PAGE_ID/feed` (texto).
- Instagram: proceso de 2 pasos: `POST /IG_ID/media` (crear container) → espera 10s → `POST /IG_ID/media_publish`.
- Auth: Page Access Token (no expira, derivado de Long-Lived User Token).
- Pendiente: obtención de credenciales productivas.

**WhatsApp Business Cloud API (planificado)**

- Reemplazo a futuro de Baileys. Requiere aprobación de Meta Business y número verificado.
- Hasta que se apruebe: Baileys + Railway.

**Google Sheets (planificado, WF-03)**

- Destino del consolidado semanal de leads.
- No implementado. Requiere tabla `leads` en Supabase + workflow n8n.

---

## 3. Modelos de datos

### 3.1 Tablas existentes en producción

**Tabla `products`**

```sql
CREATE TABLE products (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT        NOT NULL,
  category      TEXT        NOT NULL
                CHECK (category IN ('elaion', 'extravida', 'moto', 'otros')),
  technology    TEXT        NOT NULL DEFAULT '',
  description   TEXT                 DEFAULT '',
  specs         TEXT                 DEFAULT '',
  viscosity     TEXT                 DEFAULT 'N/A',
  presentations TEXT[]               DEFAULT '{}',
  applications  TEXT[]               DEFAULT '{}',
  vehicle_type  TEXT                 DEFAULT 'auto',
  image         TEXT,                             -- ruta relativa: ./assets/products/xxx.webp
  featured      BOOLEAN              DEFAULT FALSE,
  badge         TEXT,                             -- label promocional, nullable
  sort_order    INTEGER              DEFAULT 0,
  created_at    TIMESTAMPTZ          DEFAULT NOW(),
  updated_at    TIMESTAMPTZ          DEFAULT NOW()
);
```

Trigger: `products_updated_at` actualiza `updated_at` en cada UPDATE.

RLS:
- `products_public_read`: SELECT para todos (anon incluido).
- `products_admin_all`: ALL para `auth.role() = 'authenticated'`.

Datos actuales: 19 productos en 4 categorías (elaion: 6, extravida: 3, moto: 6, otros: 4).

**Tabla `sales`**

```sql
CREATE TABLE sales (
  id            BIGSERIAL PRIMARY KEY,
  product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name  TEXT        NOT NULL,  -- desnormalizado (por si se borra el producto)
  category      TEXT,
  quantity      INTEGER     NOT NULL CHECK (quantity > 0),
  registered_by TEXT,                  -- futuro: número WA del vendedor
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

RLS: authenticated = ALL. Service_role bypasa RLS.

Nota: el bot registra ventas con `service_role` key, por lo que no requiere sesión autenticada.

**Tabla `vendedores`** (antes planificada como `sellers`)

```sql
CREATE TABLE vendedores (
  telefono     TEXT PRIMARY KEY,             -- "595981234567" sin @
  nombre       TEXT NOT NULL,
  categorias   TEXT[] NOT NULL DEFAULT '{}', -- ['elaion','extravida','moto','otros']
  ciudades     TEXT[] DEFAULT '{}',
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

Allowlist del bot. La cache se refresca cada 5 minutos en el bot.
`categorias` se usará para segmentar notificaciones de stock en FASE 3.

**Tabla `vehicle_guide`** — Guía de qué lubricante usar por vehículo

```sql
CREATE TABLE vehicle_guide (
  id                       SERIAL PRIMARY KEY,
  brand                    TEXT NOT NULL,
  model                    TEXT NOT NULL,
  year_from                INT,
  year_to                  INT,
  engine_type              TEXT,     -- nafta/diesel/turbo/4t/2t/hibrido
  recommended_product_id   INT REFERENCES products(id) ON DELETE SET NULL,
  alternative_product_id   INT REFERENCES products(id) ON DELETE SET NULL,
  notes                    TEXT,
  search_terms             TEXT,     -- normalizado (trigger)
  created_at               TIMESTAMPTZ DEFAULT NOW()
);
```

Búsqueda fuzzy con índice GIN trigram. RPC: `search_vehicle_guide(q, year, max)`.
Seed inicial: ~44 vehículos comunes del mercado paraguayo (`sql/seed-vehicle-guide.sql`).

**Tabla `clientes`** — Clientes identificados por RUC

```sql
CREATE TABLE clientes (
  ruc            TEXT PRIMARY KEY,    -- '80012345-1'
  razon_social   TEXT NOT NULL,
  ciudad         TEXT,
  contacto       TEXT,
  telefono       TEXT,
  notas          TEXT,
  search_terms   TEXT,                -- trigger
  created_by     TEXT REFERENCES vendedores(telefono),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

Búsqueda fuzzy con RPC `search_clientes_fuzzy(q, max)`.
El bot crea clientes on-the-fly cuando el RUC ingresado no existe.

**Tablas `pedidos` + `pedido_items`** — Ventas vinculadas a cliente

```sql
CREATE TABLE pedidos (
  id                  BIGSERIAL PRIMARY KEY,
  cliente_ruc         TEXT NOT NULL REFERENCES clientes(ruc),
  vendedor_telefono   TEXT NOT NULL REFERENCES vendedores(telefono),
  estado              TEXT NOT NULL DEFAULT 'confirmado'
    CHECK (estado IN ('pendiente','confirmado','entregado','cancelado')),
  notas               TEXT,
  total_unidades      INT,
  total_monto         NUMERIC(12,2),     -- nullable hasta que haya lista de precios
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at        TIMESTAMPTZ
);

CREATE TABLE pedido_items (
  id              BIGSERIAL PRIMARY KEY,
  pedido_id       BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  product_id      INT REFERENCES products(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,           -- snapshot
  quantity        INT NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(12,2),
  subtotal        NUMERIC(12,2)
);
```

Vista `pedidos_resumen` para listados con joins. RPC `crear_pedido` transaccional:
crea pedido + items en una sola operación con rollback si cualquier item falla.

### 3.2 Tablas planificadas (no implementadas)

**Tabla `leads`** — Requerida por WF-03

```sql
CREATE TABLE leads (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT,
  phone         TEXT,
  email         TEXT,
  source        TEXT DEFAULT 'landing',
  interest      TEXT,
  message       TEXT,
  status        TEXT DEFAULT 'new'
                CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

Casos de uso: captura desde formulario de contacto en landing, destino del
WF-03 hacia Google Sheets.

**Tabla `inventory`** — Requerida para FASE 3 (notificaciones de stock)

```sql
CREATE TABLE inventory (
  product_id     INT PRIMARY KEY REFERENCES products(id),
  stock_units    INT NOT NULL DEFAULT 0,
  min_threshold  INT NOT NULL DEFAULT 10,
  last_alert_at  TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

Permite alertas proactivas vía Supabase Realtime cuando un producto cruza
el umbral mínimo, segmentadas por categoría a los vendedores correspondientes.

**Tabla `content_log`** — Para trazabilidad de publicaciones automáticas n8n

```sql
CREATE TABLE content_log (
  id            BIGSERIAL PRIMARY KEY,
  workflow_id   TEXT NOT NULL,          -- 'WF-01' | 'WF-02' | etc.
  platform      TEXT NOT NULL,          -- 'facebook' | 'instagram'
  post_id       TEXT,                   -- ID devuelto por Meta API
  status        TEXT NOT NULL,          -- 'success' | 'error'
  payload       JSONB,                  -- snapshot del post enviado
  error_detail  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

Permite auditar qué se publicó, cuándo y con qué resultado.

### 3.3 Relaciones entre tablas

```
products ──< sales (product_id → products.id, ON DELETE SET NULL)
sellers  ──< sales (wa_number → registered_by, sin FK formal por ahora)
products ──< content_log (via payload JSONB, sin FK)
```

### 3.4 Configuración actual de RLS

| Tabla | anon | authenticated | service_role |
|---|---|---|---|
| products | SELECT | ALL | bypasa RLS |
| sales | — | ALL | bypasa RLS |
| leads (futuro) | INSERT | ALL | bypasa RLS |
| sellers (futuro) | — | ALL | bypasa RLS |

---

## 4. Flujos de datos

### 4.1 Carga inicial del catálogo público

```
Visitante abre index.html
  │
  ▼
DOMContentLoaded → CGS.init()
  │
  ├─[Supabase disponible]──► SELECT * FROM products ORDER BY sort_order, id
  │                           │
  │                           ▼
  │                     localStorage['cgs_products_v1'] = data
  │                           │
  │                           ▼
  │                     renderProducts() desde localStorage
  │
  └─[Supabase NO disponible]──► ¿localStorage tiene datos v1.2.0?
                                │
                                ├─[SÍ]── renderProducts() desde localStorage
                                │
                                └─[NO]── _saveLocal(DEFAULTS) → renderProducts()
```

El visitante nunca ve un loading interminable: siempre hay datos disponibles.

### 4.2 Administrador edita un producto

```
Admin en admin.html → openEditModal(id)
  │
  ▼
handleFormSubmit()
  │
  ├─ CGS.update(id, formData)
  │     │
  │     ├─[Supabase disponible]
  │     │     │
  │     │     ▼
  │     │  UPDATE products SET ... WHERE id = ?    ← Supabase (auth JWT)
  │     │     │
  │     │     ▼
  │     │  SELECT * FROM products → _saveLocal()  ← re-sync completo
  │     │     │
  │     │     ▼
  │     │  Supabase Webhook dispara → n8n (si hay UPDATE hook configurado)
  │     │
  │     └─[Supabase NO disponible]
  │           │
  │           ▼
  │        Actualiza solo localStorage (cambios no llegan a Supabase)
  │
  ▼
renderStats() + renderProductTable() ← refleja localStorage actualizado
```

Riesgo: si el admin trabaja sin conexión, los cambios quedan solo en localStorage del browser y se perderán al limpiar caché. Ver sección 6.

### 4.3 Vendedor registra una venta via bot

```
Vendedor envía "!v 3 2" en WhatsApp
  │
  ▼
Baileys sock.ev 'messages.upsert'
  │
  ▼
handleCommand('!v', ['3', '2'], supabase)  ← supabase con service_role key
  │
  ▼
cmdVenta(['3', '2'], supabase)
  │
  ├─ SELECT * FROM products (fetch completo en memoria)
  │
  ├─ Resolver producto por ID=3
  │
  ▼
INSERT INTO sales (product_id, product_name, category, quantity)
VALUES (3, 'ELAION F30 5W-40', 'elaion', 2)
  │
  ▼
Responde: "✅ Venta registrada — [3] ELAION F30 5W-40 × 2 unidades"
```

Nota: cada comando de catálogo hace un SELECT a Supabase. No hay caché en el bot — consulta live siempre.

### 4.4 Publicación automática al agregar producto

```
Admin agrega nuevo producto en admin.html
  │
  ▼
INSERT INTO products (via CGS.add())
  │
  ▼
Supabase Webhook (tipo INSERT, tabla products)
  │
  ▼ HTTP POST con payload {record: {...}, type: "INSERT"}
n8n — Workflow "CGS — Nuevo Producto → Redes Sociales"
  │
  ├─ Formatear Post (Code node: texto + hashtags por categoría)
  │
  ├─[¿Tiene imagen?]
  │
  ├─[SÍ] POST /PAGE_ID/photos (Facebook con imagen)
  │        │
  │        ▼
  │       POST /IG_ID/media (Instagram container)
  │        │
  │        ▼ (wait 10s)
  │       POST /IG_ID/media_publish
  │
  └─[NO] POST /PAGE_ID/feed (Facebook solo texto)
```

Limitación actual: el workflow de Instagram solo funciona con imagen. Sin imagen, no hay publicación en Instagram. El nodo de texto-only de Facebook cubre ese caso para Facebook, pero Instagram queda sin publicar.

### 4.5 Post semanal automático (WF-02)

```
Cron: Lunes 10:00
  │
  ▼
GET /rest/v1/products?featured=eq.true&order=sort_order.asc&limit=4
(usando SUPABASE_SERVICE_KEY como header)
  │
  ▼
Formatear Post Semanal (Code node)
  │
  ├─[¿Hay productos?]─[NO]──► fin (no publica)
  │
  └─[SÍ]
      ├─ POST /PAGE_ID/feed  (Facebook)
      └─ POST /IG_ID/media   (Instagram — REELS type)  ← BUG: falta paso media_publish
```

---

## 5. Decisiones arquitectónicas (ADRs)

### ADR-001: Static site sin framework para la landing

**Estado:** Adoptado y en producción.

**Contexto:** PYME con presupuesto limitado, necesidad de deploys rápidos y sin CI/CD complejo.

**Decisión:** HTML + CSS + Vanilla JS ES6. Sin React, Vue, Svelte, ni build tool.

**Consecuencias positivas:**
- Deploy instantáneo en Netlify (sin build step significativo).
- Sin dependencias de npm que romper.
- Cualquier persona con conocimientos web básicos puede editar.
- Carga inicial <100KB (sin bundle JS de framework).

**Consecuencias negativas:**
- Sin tipado. Bugs de runtime que TypeScript capturaría en compilación.
- Sin componentes reutilizables formales. HTML se duplica en index y admin.
- Sin hot reload en desarrollo.
- A medida que crezca la funcionalidad, el mantenimiento se complica.

**Criterio de revisión:** Si se requiere más de 2 nuevas páginas con lógica de estado compleja, evaluar migración a Astro (mantiene SSG, agrega componentes opcionales).

---

### ADR-002: Supabase como backend único

**Estado:** Adoptado y en producción.

**Contexto:** Se necesita persistencia de datos, auth y notificaciones (webhooks) sin servidor propio.

**Decisión:** Supabase BaaS para PostgreSQL + Auth + Webhooks.

**Consecuencias positivas:**
- Free tier cubre todo el uso actual (500MB DB, 50MB storage, 50K MAU auth).
- RLS permite una arquitectura donde el cliente accede a la DB directamente de forma segura.
- Webhooks nativos eliminan la necesidad de un servidor intermedio para eventos.
- SDK JS disponible via CDN (sin npm en la landing).

**Consecuencias negativas:**
- Vendor lock-in moderado.
- Si el proyecto Supabase cae o se elimina, el sistema pierde acceso a datos en vivo (mitigado por localStorage fallback).
- El free tier tiene límites que impactan si el volumen crece (especialmente en funciones Edge y realtime).

---

### ADR-003: Offline-first con localStorage como cache

**Estado:** Adoptado. Implementación parcialmente incompleta (ver GAP-001).

**Contexto:** La landing debe funcionar aunque Supabase tenga downtime o el usuario tenga conectividad inestable.

**Decisión:** `data.js` usa localStorage como cache de lectura. Supabase es la fuente de verdad para escrituras. Las lecturas siempre van a localStorage primero.

**Consecuencias positivas:**
- La landing pública nunca falla en mostrar el catálogo.
- Performance: sin latencia de red para renderizar productos.

**Consecuencias negativas:**
- El admin que trabaja offline no persiste cambios en Supabase (silencioso, sin warning al usuario — ver GAP-001).
- Cache puede estar desincronizado entre tabs del mismo browser o entre browsers distintos.
- No hay invalidación de cache entre usuarios (si admin A agrega producto, admin B no lo ve hasta refrescar).

---

### ADR-004: Baileys para WhatsApp (protocolo no oficial)

**Estado:** Adoptado para desarrollo y fase inicial.

**Contexto:** WhatsApp Business Cloud API requiere aprobación de Meta y una inversión de tiempo en configuración. Se necesita un bot funcional rápido.

**Decisión:** Usar Baileys (WA Web protocol reverse-engineered) para el MVP del bot.

**Consecuencias positivas:**
- Funcional inmediatamente con cualquier número WhatsApp.
- Sin proceso de aprobación.
- Sin costo adicional.

**Consecuencias negativas (CRÍTICO):**
- Baileys viola los ToS de WhatsApp. Meta puede banear el número en cualquier momento sin previo aviso.
- El número vinculado no puede usarse normalmente en el teléfono mientras el bot está activo (sesión exclusiva).
- La sesión se pierde si la carpeta `auth_info/` se corrompe o el servidor se reinicia sin que el QR fue escaneado.
- No apto para producción a escala ni para uso con número de teléfono principal de la empresa.

**Decisión de migración:** Planificar migración a WhatsApp Business Cloud API cuando el bot esté validado en producción. Ver Hoja de Ruta, Fase 3.

---

### ADR-005: Service_role key en el bot (bypasa RLS)

**Estado:** Adoptado.

**Contexto:** El bot registra ventas. La tabla `sales` tiene RLS que requiere `authenticated`. El bot no puede hacer login con Supabase Auth vía email/password de manera segura en un proceso desatendido.

**Decisión:** El bot usa `SUPABASE_SERVICE_KEY` que bypasa RLS.

**Consecuencias:** La `service_role` key tiene acceso irrestricto a toda la base de datos. Su compromiso sería crítico.

**Mitigación requerida:** La key debe estar EXCLUSIVAMENTE en variables de entorno de Railway. Nunca en repositorio, nunca en logs.

---

### ADR-006: Dos claves Supabase distintas por cliente

**Estado:** Adoptado.

| Cliente | Key usada | Permisos |
|---|---|---|
| Landing (browser) | `SUPABASE_ANON` | SELECT en products, nada en sales |
| Admin (browser, auth activa) | `SUPABASE_ANON` + JWT de sesión | ALL en products y sales |
| Bot (Node.js) | `SUPABASE_SERVICE_KEY` | TODO (bypasa RLS) |
| n8n (workflow) | `SUPABASE_SERVICE_KEY` | TODO (bypasa RLS) |

---

### ADR-007: n8n Cloud free tier para automatizaciones

**Estado:** Adoptado para fase inicial (Sofía @growth).

**Contexto:** Presupuesto cero para infraestructura de automatización.

**Decisión:** n8n Cloud free tier. Límite: 5 workflows activos.

**Plan de contingencia si se superan los límites:** n8n self-hosted en Docker en el mismo servidor de Railway o en un VPS de USD 5/mes. Los workflows exportados como JSON son portables.

---

### ADR-008 (PENDIENTE): Estrategia de gestión de leads

**Estado:** Pendiente de decisión.

**Opciones en evaluación:**
1. Formulario HTML en landing → INSERT en tabla `leads` → n8n WF-03 → Google Sheets.
2. Formulario en landing → directo a Google Forms (sin Supabase).
3. Click en WhatsApp CTA → tracking manual en Google Sheets por equipo.

**Recomendación Santiago:** Opción 1. Mantiene datos en Supabase (fuente de verdad única), permite análisis SQL futuro, y la exportación a Sheets es automática via n8n.

### ADR-009: Búsqueda fuzzy en Postgres vía pg_trgm

**Contexto:** El bot necesita encontrar productos a partir de queries con
typos ("elaiom 5w30"), nombres parciales ("elaion"), o términos de vehículo
("hilux"). La búsqueda exacta no alcanza.

**Decisión:** Usar la extensión `pg_trgm` de Postgres (nativa en Supabase)
con índice GIN. La RPC `search_products_fuzzy` tokeniza la query, busca cada
token contra `search_terms` con `word_similarity()` + ILIKE substring, y
agrega por número de tokens matcheados.

**Por qué no Algolia/Meilisearch/Elasticsearch:**
- Costo cero adicional (Postgres ya está).
- 19 productos: cualquier solución es O(n) en la práctica.
- Sin nueva infraestructura que mantener.

**Consecuencias:**
- (+) Sin dependencias externas, sin sincronización de índices.
- (+) Performance fina (<10ms) con índice trigram.
- (-) Limitado a similitud por trigrams: no entiende sinónimos
  semánticos ("aceite" vs "lubricante" — resuelto vía stop-words).

### ADR-010: Panel admin con auth dual (Supabase + fallback local)

**Contexto:** El panel admin necesita autenticación. Tenemos dos opciones:
backend (Netlify Functions con service_role) o frontend directo
(anon key + Supabase Auth + RLS para `authenticated`).

**Decisión:** Frontend directo con Supabase Auth, sin backend intermedio.
Las tablas de admin tienen RLS permisiva para el rol `authenticated`. Para
evitar que cualquiera se cree cuenta, el sign-up por email está
deshabilitado en Supabase Auth dashboard — las cuentas de admin se crean
manualmente desde el panel de Supabase.

**Fallback local:** Cuando Supabase no está configurado (modo dev), el
panel cae a credenciales hardcoded (`admin` / `cgs2024`) almacenadas en
localStorage. En producción este fallback queda cerrado: si Supabase
está configurado y las credenciales no validan, no se intenta el fallback.

**Por qué no Netlify Functions:**
- Cero dependencias agregadas (sin lambda runtime, sin secrets management
  separado del frontend).
- Lectura/escritura instantánea desde el browser (no hay roundtrip a
  function).
- RLS es robusto: la separación entre service_role (bot) y authenticated
  (admin web) está clara.

**Consecuencias:**
- (+) Stack más simple, sin backend que mantener.
- (+) El JWT de Supabase Auth viaja en cada request — auditable.
- (-) Si hubiera múltiples admins con permisos distintos, RLS por rol se
  vuelve complejo. Por ahora hay un solo admin, así que no aplica.
- (-) Crítico mantener el sign-up deshabilitado en Supabase Auth.

### ADR-011: Pairing code vs QR para vinculación de Baileys

**Contexto:** Baileys soporta dos modos para vincular WhatsApp: QR
(se imprime en terminal) o pairing code (un código de 8 chars que se
ingresa manualmente en WhatsApp).

**Decisión:** Usar pairing code en producción cuando hay `PHONE_NUMBER`
configurado; QR como fallback para desarrollo local.

**Por qué:**
- El QR se imprime en logs de Railway pero es muy difícil escanearlo
  desde la UI del dashboard (texto monoespaciado, refresca cada 20s).
- El pairing code es texto plano legible, se copia y pega.
- El código se regenera automáticamente cada 90s si no se vincula —
  evita la frustración de "expiró antes de que lo ingresara".

**Auto-recovery:** Si WhatsApp cierra la sesión (`DisconnectReason.loggedOut`),
el bot limpia `auth_info/` automáticamente y reinicia el ciclo de
vinculación. El admin solo tiene que ingresar el nuevo código.

---

## 6. Gaps y deuda técnica

Esta sección distingue entre issues críticos (bloquean producción segura) y mejoras recomendadas (pueden esperar).

### CRÍTICOS — Resolver antes de escalar

**GAP-001: Modo offline silencioso en admin**

- **Qué es:** Si el admin edita productos sin Supabase disponible, los cambios se guardan solo en localStorage. Al limpiar caché o cambiar de browser, se pierden.
- **Impacto:** Pérdida de datos de catálogo.
- **Fix:** Mostrar banner de advertencia cuando `_db === null`. Deshabilitar botones de escritura o mostrar warning modal antes de guardar en modo offline.
- **Archivo:** `js/admin.js` en `handleFormSubmit()`.

**GAP-002: Credenciales de admin hardcodeadas en localStorage**

- **Qué es:** `admin.js` inicializa las credenciales `admin/cgs2024` en localStorage si no existen. Cualquiera con acceso al browser puede leer el localStorage.
- **Impacto:** Acceso no autorizado al panel admin si alguien tiene acceso físico al browser o mediante XSS.
- **Fix:** Migrar completamente a Supabase Auth. Eliminar el código de `DEFAULT_CREDS` y `ADMIN_CREDS_KEY`. El fallback local debería desaparecer una vez que Supabase Auth está confirmado funcional.
- **Archivo:** `js/admin.js` líneas 1-9, 32-37, 80-90.

**GAP-003: Supabase Auth sin email confirmation**

- **Qué es:** El usuario admin fue creado con `auth.sign_up()` pero la confirmación de email está posiblemente deshabilitada.
- **Impacto:** Si alguien adivina el email del admin, puede intentar reset de contraseña. Sin 2FA, el acceso al email compromete el panel.
- **Fix:** Habilitar email confirmation en Supabase Auth settings. Configurar un email de recuperación real. Opcional: habilitar MFA.

**GAP-004: Número de WhatsApp principal expuesto**

- **Qué es:** Baileys requiere vincular un número real de WhatsApp. Si ese número es el número principal del negocio, el riesgo de ban afecta las comunicaciones del negocio.
- **Impacto:** Ban del número de negocio por violación de ToS de WhatsApp.
- **Fix:** Usar un número secundario dedicado exclusivamente al bot hasta migrar a WA Business Cloud API.

**GAP-005: auth_info/ en repositorio / Railway**

- **Qué es:** La carpeta `auth_info/` contiene las credenciales de la sesión de WhatsApp. Si se sube a un repositorio público o se expone, cualquiera puede usar esa sesión.
- **Impacto:** Suplantación de identidad del bot en WhatsApp.
- **Fix:** Confirmar que `auth_info/` está en `.gitignore` del repo `cgs-bot`. En Railway, usar un volumen persistente o un bucket S3 para almacenar `auth_info/` entre reinicios.

**GAP-006: Sin manejo de errores en el bot para Supabase down**

- **Qué es:** Si Supabase no está disponible, las funciones async del bot lanzarán errores no capturados o devolverán respuestas de error crípticas al vendedor.
- **Impacto:** El bot falla silenciosamente o responde con mensajes técnicos.
- **Fix:** Wrap genérico de try/catch en `handleCommand()` con mensaje de error amigable. Implementar retry con backoff exponencial para operaciones críticas.

---

### DEUDA TÉCNICA — Mejoras recomendadas

**DEUDA-001: Sin índices en tabla `sales`**

- `sales` no tiene índice en `created_at`. Los comandos `!ventas hoy/semana` y `!top` hacen full table scan con `WHERE created_at >= ?`. Inaceptable cuando haya miles de registros.
- Fix: `CREATE INDEX sales_created_at_idx ON sales(created_at DESC);`
- También considerar índice en `product_id` para JOINs futuros.

**DEUDA-002: Bot hace SELECT completo de products en cada comando**

- Cada `!p`, `!v`, `!cat` hace `SELECT * FROM products` para buscar en memoria.
- A 19 productos: irrelevante. A 200+ productos: ineficiente.
- Fix a corto plazo: cache en memoria del módulo con TTL de 5 minutos.
- Fix definitivo: búsqueda full-text nativa de PostgreSQL (`to_tsvector` + `to_tsquery`).

**DEUDA-003: WhatsApp config guardada solo en localStorage del admin**

- El número de WhatsApp y mensaje default están en `localStorage['cgs_config']`.
- Si el admin limpia el caché, la config se pierde y vuelve al default.
- Si hay dos admins en browsers distintos, pueden tener configs distintas.
- Fix: tabla `config` en Supabase o row dedicada en `products` con `id=0` (hack no recomendado). Mejor: tabla `settings` key-value.

**DEUDA-004: sort_order en products no tiene UI**

- El campo `sort_order` existe en la BD pero el panel admin no tiene drag-and-drop ni campo numérico para reordenar productos.
- Los productos del bot se muestran en orden de `sort_order`, pero el admin no puede cambiarlo.
- Fix: agregar campo numérico `sort_order` en el form modal del admin.

**DEUDA-005: Sin validación de tipo de imagen en admin**

- El campo "URL de imagen" acepta cualquier string. Si se ingresa una URL rota, el catálogo muestra el placeholder, pero sin error visible para el admin.
- Fix: validar que la URL devuelve un 200 con content-type image/* antes de guardar. El preview actual ayuda visualmente pero no bloquea el guardado.

**DEUDA-006: n8n WF-02 (post semanal) con bug en Instagram**

- El nodo "Instagram — Post Semanal" usa `media_type: REELS` pero no incluye el paso obligatorio de `media_publish`. El workflow publicará en Facebook pero fallará silenciosamente en Instagram.
- Fix en `post-semanal.json`: agregar nodo "Instagram — Media Publish" equivalente al que existe en `nuevo-producto.json`.

**DEUDA-007: Meta Access Token caduca cada 60 días (si no es Page Token)**

- Si en producción se configuró un User Token en lugar de un Page Access Token, el workflow dejará de funcionar a los 60 días sin aviso.
- Fix: verificar que el token almacenado en n8n es un Page Access Token (no expira). Si es User Token, renovar y convertir a Page Token.

**DEUDA-008: Sin sales tab funcional en admin**

- `admin.html` tiene una pestaña "Ventas" pero no tiene funcionalidad implementada. El admin no puede ver las ventas registradas por el bot desde el panel web.
- Fix: implementar tabla de ventas con filtros de fecha y exportación CSV en la pestaña de Ventas del admin.

---

## 7. Hoja de ruta técnica

Secuencia recomendada priorizada por impacto vs. esfuerzo. Contexto de PYME: una persona implementando a tiempo parcial.

### Fase 0 — Hardening de seguridad (1-2 semanas) [URGENTE]

Objetivos: cerrar todos los gaps CRÍTICOS antes de cualquier crecimiento.

| Tarea | Gap | Esfuerzo |
|---|---|---|
| Eliminar credenciales hardcodeadas en admin.js; exigir Supabase Auth | GAP-002 | M |
| Agregar banner de advertencia modo offline en admin | GAP-001 | S |
| Confirmar `auth_info/` en .gitignore + configurar volumen persistente en Railway | GAP-005 | S |
| Verificar/habilitar email confirmation en Supabase Auth | GAP-003 | S |
| Vincular bot a número secundario dedicado | GAP-004 | S |
| Try/catch genérico en handleCommand() con mensajes amigables | GAP-006 | S |

### Fase 1 — Completar funcionalidades core (2-4 semanas)

Objetivos: el sistema hace todo lo que debería antes de crecer.

| Tarea | Deuda/Gap | Esfuerzo |
|---|---|---|
| Pestaña Ventas funcional en admin (tabla + filtros fecha + export CSV) | DEUDA-008 | M |
| Campo sort_order editable en form de producto | DEUDA-004 | S |
| Fix bug WF-02 Instagram media_publish | DEUDA-006 | S |
| Índice en sales.created_at | DEUDA-001 | XS |
| Tabla `settings` en Supabase para config de WhatsApp | DEUDA-003 | M |
| Verificar Page Access Token en n8n (no expira) | DEUDA-007 | XS |

### Fase 2 — Automatizaciones de crecimiento (4-6 semanas)

Sofía (@growth) lidera esta fase con soporte de Dev.

| Tarea | WF | Esfuerzo |
|---|---|---|
| Obtener credenciales productivas de Meta Graph API | — | M (depende de aprobación Meta) |
| Importar y activar WF-01 (nuevo producto) en n8n Cloud | WF-01 | S |
| Importar y activar WF-02 (post semanal) con bug fix | WF-02 | S |
| Crear tabla `leads` en Supabase | — | XS |
| Agregar formulario de contacto en landing → INSERT a leads | — | M |
| Implementar WF-03 (leads → Google Sheets semanal) | WF-03 | M |
| Implementar WF-04 (alerta producto sin imagen) | WF-04 | S |
| Implementar WF-05 (publicaciones fechas clave) | WF-05 | S |

### Fase 3 — Escala y madurez (largo plazo, 3+ meses)

| Tarea | Descripción | Decisión previa |
|---|---|---|
| Migración a WhatsApp Business Cloud API | Reemplazar Baileys. Elimina riesgo de ban. Requiere aprobación Meta. | ADR-004 |
| Tabla `sellers` + atribución de ventas por vendedor | Multi-vendedor en el bot | ADR-008 |
| Cache con TTL en bot para productos | Reducir queries a Supabase | DEUDA-002 |
| Búsqueda full-text en PostgreSQL | Mejorar calidad de búsqueda `!p` | DEUDA-002 |
| Tabla `content_log` + nodo de log en workflows n8n | Auditoría de publicaciones | — |
| Evaluación de migración landing a Astro | Si se agregan >2 páginas con estado | ADR-001 |
| Dashboard de analytics en admin | Ventas por período, por vendedor, por categoría | Fase 1 completada |

---

## Apéndice A — Variables de entorno por servicio

| Variable | Servicio | Descripción |
|---|---|---|
| `SUPABASE_URL` | Netlify, Railway, n8n | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Netlify | Clave pública (RLS activo) |
| `SUPABASE_SERVICE_KEY` | Railway, n8n | Clave de servicio (bypasa RLS) — SECRETO |
| `FACEBOOK_PAGE_ID` | n8n | ID de la página de Facebook |
| `INSTAGRAM_ACCOUNT_ID` | n8n | ID de la cuenta de Instagram Business |
| `META_ACCESS_TOKEN` | n8n | Page Access Token (no expira) |

## Apéndice B — URLs del sistema

| Recurso | URL |
|---|---|
| Landing pública | https://cgs-paraguay.netlify.app |
| Panel admin | https://cgs-paraguay.netlify.app/admin.html |
| Supabase Dashboard | https://supabase.com/dashboard |
| n8n Cloud | https://app.n8n.cloud |
| Railway (bot) | https://railway.app (proyecto cgs-bot, deploy pendiente) |

## Apéndice C — Catálogo de productos (estado actual)

19 productos en 4 líneas:

| Línea | Cantidad | Categoría DB |
|---|---|---|
| ELAION (autos) | 6 | `elaion` |
| EXTRAVIDA (camiones/pesados) | 3 | `extravida` |
| RÖD (motos) | 6 | `moto` |
| Otros (refrigerante, frenos, grasa, hidráulico) | 4 | `otros` |

## Apéndice D — Comandos del bot (referencia rápida)

| Comando | Alias | Descripción |
|---|---|---|
| `!ayuda` | `!a` | Help |
| `!catalogo` | `!c` | Lista todos con IDs |
| `!producto [id/nombre]` | `!p` | Ficha de producto |
| `!categoria [tipo]` | `!cat` | Filtro por categoría |
| `!destacados` | `!d` | Productos con featured=true |
| `!venta [id] [cant]` | `!v` | Registrar venta |
| `!ventas hoy/semana` | — | Resumen de ventas |
| `!top` | — | Ranking top 5 (últimos 7 días) |
