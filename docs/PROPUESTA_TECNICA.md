# Sistema Digital CGS Paraguay
## Propuesta Técnica — Arquitectura y Plan de Implementación

**Fecha:** Mayo 2026 | **Stack actual:** HTML5 + CSS3 + Vanilla JS + Netlify

---

## 1. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                      │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │  Landing Page        │  │  Admin Panel                 │ │
│  │  cgs-paraguay.netlify│  │  /admin.html                 │ │
│  │  .app (Netlify CDN)  │  │  Auth: Supabase Auth         │ │
│  └──────────┬───────────┘  └───────────┬──────────────────┘ │
└─────────────┼────────────────────────── ┼───────────────────┘
              │ read (anon)               │ read/write (auth)
              ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE DATOS (Supabase)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL  │  Auth  │  Storage  │  Edge Functions  │   │
│  │  products    │  users │  (futuro) │  (futuro)        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│              CAPA DE AUTOMATIZACIÓN (VPS)                    │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  n8n             │  │  WhatsApp Bot                    │ │
│  │  self-hosted     │  │  (Baileys / WA Business API)     │ │
│  │  workflows:      │  │  commands:                       │ │
│  │  · new product   │  │  · /precio                       │ │
│  │  · social post   │  │  · /catalogo                     │ │
│  │  · weekly digest │  │  · /cotizar                      │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | HTML5 + Vanilla JS (actual) | Sin cambio, funciona bien |
| Hosting | Netlify (actual) | CDN global, auto-deploy, free tier |
| Base de datos | **Supabase** (PostgreSQL) | Free tier generoso, Auth incluida, JS client, RLS |
| Automatización | **n8n** self-hosted | Open source, 300+ integraciones, sin costo por ejecución |
| WhatsApp (opción A) | **Baileys** (Node.js) | Open source, sin costo por mensaje |
| WhatsApp (opción B) | **WhatsApp Business Cloud API** | Oficial Meta, ToS-compliant, USD 0.005-0.09/conversación |
| VPS (Etapas 2 y 3) | DigitalOcean / Hetzner | Ubuntu 22.04, 2GB RAM, ~USD 6-12/mes |

### Por qué Supabase sobre Firebase / PlanetScale / Neon
- **PostgreSQL nativo**: arrays para `presentations[]` y `applications[]` sin serialización adicional
- **Row Level Security**: anon puede leer, admin autenticado puede escribir. Sin middleware propio
- **Auth incluida**: eliminamos el sistema de credenciales en localStorage
- **SDK JS UMD**: funciona en scripts `<script src="">` sin bundler ni build step
- **Free tier**: 500MB DB + 2GB bandwidth + 50MB storage — suficiente para años de operación de CGS

---

## 3. Etapa 1: Catálogo en la Nube — Implementación

### 3.1 Estado del código

El código de integración **ya está implementado** en la rama `main`. Modo de operación:

```
SUPABASE_URL = ''  →  modo offline (localStorage, comportamiento actual)
SUPABASE_URL = 'https://xxx.supabase.co'  →  modo cloud (Supabase)
```

**Archivos modificados:**
- `js/data.js` — CGS module ahora async, con Supabase SDK
- `js/app.js` — `await CGS.init()` en DOMContentLoaded  
- `js/admin.js` — login con Supabase Auth + CRUD async
- `index.html` / `admin.html` — Supabase JS CDN añadido

### 3.2 Setup del proyecto Supabase (pasos para Gabriel)

```bash
# 1. Crear proyecto en https://supabase.com (free, ~2 min)
# 2. Settings > API → copiar Project URL y anon public key

# 3. SQL Editor > New query → pegar y ejecutar supabase_schema.sql

# 4. Authentication > Users > Invite user → crear el email del admin
#    (ej: admin@cgs.com.py)

# 5. En js/data.js, líneas 14-15:
const SUPABASE_URL  = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON = 'TU_ANON_KEY';

# 6. git add js/data.js && git commit && git push
#    Netlify redeploya automáticamente (~30 seg)

# 7. Abrir admin.html, iniciar sesión con el email del paso 4
#    Clic en "Restaurar predeterminados" → carga los 19 productos a Supabase
```

### 3.3 Schema de la base de datos

```sql
-- Tabla products (ver supabase_schema.sql para versión completa)
products (
  id            bigint  -- auto-increment PK
  name          text    -- "YPF RÖD 4T 10W-40"
  category      text    -- elaion | extravida | moto | otros
  technology    text    -- "Semi-Sintético"
  description   text
  specs         text    -- "API SL • JASO MA2"
  viscosity     text    -- "10W-40"
  presentations text[]  -- ["1L","4L"]
  applications  text[]  -- ["Motos 4T","Scooters"]
  vehicle_type  text    -- auto | moto | camion
  image         text    -- URL de la imagen
  featured      boolean
  badge         text    -- "MÁS RECOMENDADO" | null
  sort_order    integer
  created_at    timestamptz
  updated_at    timestamptz
)
```

### 3.4 Seguridad (Row Level Security)

```sql
-- Lectura pública (catálogo visible sin auth)
create policy "products_public_read" on products
  for select using (true);

-- Escritura solo para admins autenticados en Supabase
create policy "products_admin_all" on products
  for all using (auth.role() = 'authenticated');
```

La anon key en el frontend es segura porque RLS bloquea cualquier mutación sin token de autenticación válido.

---

## 4. Etapa 2: Bot de WhatsApp — Arquitectura

### 4.1 Opciones comparadas

| Criterio | Baileys (informal) | WA Business Cloud API |
|---|---|---|
| Costo | USD 0 | USD 0.005-0.09/conversación |
| ToS compliance | No oficial (riesgo de ban) | Oficial Meta |
| Setup | Escanear QR con celular | Meta Business Verification (3-7 días) |
| Número requerido | Cualquier número WA | Número exclusivo para el bot |
| Funcionalidad | Completa | Completa |
| Recomendado para | Prototipo / testing | Producción |

**Recomendación:** Iniciar con Baileys para validar flujos, migrar a Business Cloud API antes del lanzamiento oficial al equipo de ventas.

### 4.2 Arquitectura del bot

```
WhatsApp Message
      │
      ▼
[Baileys / WA API]  ──webhook──▶  [n8n Workflow]
                                        │
                              ┌─────────┴──────────┐
                              ▼                    ▼
                       [Supabase Query]    [Static response]
                              │
                              ▼
                       [Format response]
                              │
                              ▼
                    [Send WA message back]
```

### 4.3 Comandos implementados (Fase 1)

| Comando | Trigger | Respuesta |
|---|---|---|
| Bienvenida | Cualquier mensaje nuevo | Menú de opciones |
| `/catalogo` | Texto literal | Lista de categorías (ELAION, EXTRAVIDA, RÖD, Otros) |
| `/catalogo motos` | Texto | Lista de productos RÖD con viscosidades |
| `/precio 10w40` | Regex `/precio (.+)/` | Productos que contienen "10w40" en nombre o specs |
| `/cotizar [producto]` | Texto | Derivar a vendedor humano + capturar lead |
| `/horario` | Texto | Horario de atención y contacto directo |

### 4.4 Stack del servidor WhatsApp

```
VPS Ubuntu 22.04 (2GB RAM, 2 vCPU)
├── Node.js 20 LTS
├── Baileys (whatsapp-web.js fork)
│   └── express server (puerto 3000)
│       └── webhook POST /message
└── PM2 (process manager, auto-restart)
```

**Archivo de configuración del bot:**
```javascript
// whatsapp-bot/index.js
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');

// Commands router → Supabase queries → formatted responses
```

### 4.5 Variables de entorno requeridas

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...   # service_role key (no la anon)
PORT=3000
N8N_WEBHOOK_URL=https://n8n.cgs-paraguay.com/webhook/whatsapp
```

---

## 5. Etapa 3: Automatización con n8n

### 5.1 Instalación en VPS

```bash
# Docker Compose (recomendado)
docker compose up -d  # n8n en puerto 5678

# Configurar subdominio: n8n.cgs-paraguay.com → VPS IP
# HTTPS via Caddy o nginx + Certbot
```

### 5.2 Workflows definidos

**Workflow 1: Nuevo producto → Post en redes sociales**

```
Trigger: Supabase Webhook (INSERT en products)
    │
    ▼
Format post: "🆕 Nuevo en nuestro catálogo: [nombre]
             [descripción corta]
             Consultanos por WhatsApp 👇
             [link al sitio]"
    │
    ├──▶ Instagram Graph API (post en feed)
    └──▶ Facebook Pages API (post en página)
```

**Workflow 2: Digest semanal automático**

```
Trigger: Cron (lunes 9:00 AM PY)
    │
    ▼
Query Supabase: productos featured o nuevos de la semana
    │
    ▼
Generar imagen con Canva API o template HTML→screenshot
    │
    ├──▶ Instagram Story
    └──▶ Facebook Post
```

**Workflow 3: Lead de WhatsApp → Notificación al equipo**

```
Trigger: Webhook desde bot cuando recibe /cotizar
    │
    ▼
Extraer: nombre, número, producto consultado, timestamp
    │
    ├──▶ Guardar en Supabase tabla leads
    └──▶ Notificar a vendedor asignado por WhatsApp
```

### 5.3 Integraciones requeridas

| Servicio | Para qué | Cómo obtener acceso |
|---|---|---|
| Meta Graph API | Publicar en Instagram y Facebook | Meta for Developers > crear App |
| Instagram Basic Display API | Leer métricas | Mismo App de Meta |
| n8n (self-hosted) | Orquestador de workflows | VPS + Docker |

---

## 6. Infraestructura y Costos

### 6.1 Costos mensuales (producción)

| Servicio | Plan | Costo/mes |
|---|---|---|
| Netlify | Free | USD 0 |
| Supabase | Free (hasta 500MB) | USD 0 |
| VPS (n8n + bot) | Hetzner CX22 / DigitalOcean Basic | USD 6-12 |
| Dominio | cgs-paraguay.com | USD 1.5 (USD 18/año) |
| n8n | Self-hosted (en VPS) | USD 0 |
| WhatsApp Business API | Meta (si se usa oficial) | USD 15-50 según volumen |
| **Total mínimo** | | **USD 7.5/mes** |
| **Total con WA Business API** | | **USD 25-65/mes** |

### 6.2 Escalabilidad

El sistema puede manejar sin cambios:
- Hasta ~10,000 productos en el catálogo
- Hasta ~100 admins simultáneos
- Hasta ~1,000 consultas WhatsApp/día
- Hasta ~500 posts/mes en redes sociales

Para crecer más allá: migrar Supabase a Pro plan (USD 25/mes) y VPS a instancia con más RAM.

---

## 7. Seguridad

| Riesgo | Mitigación |
|---|---|
| Credenciales admin en localStorage | Reemplazadas por Supabase Auth con JWT |
| SUPABASE_ANON_KEY expuesta en frontend | Es pública por diseño; RLS protege las mutaciones |
| SUPABASE_SERVICE_KEY en el bot | Solo en variables de entorno del VPS, nunca en el frontend |
| WhatsApp ban (Baileys) | Validar con Business Cloud API antes de lanzar a producción |
| n8n expuesto en internet | HTTPS obligatorio + basic auth en n8n dashboard |

---

## 8. Plan de Migración

```
Semana 1 (Etapa 1):
  □ Crear proyecto Supabase
  □ Ejecutar supabase_schema.sql
  □ Llenar SUPABASE_URL + SUPABASE_ANON en data.js
  □ Push → Netlify redeploya
  □ Login en admin.html con nueva cuenta Supabase
  □ "Restaurar predeterminados" → 19 productos migrados

Semana 2-3 (Etapa 1 cierre):
  □ Validar CRUD desde admin.html
  □ Validar que sitio público lee desde Supabase
  □ Capacitar a CGS admin en uso del panel

Semana 4-7 (Etapa 2):
  □ Provisionar VPS
  □ Setup Node.js + Baileys
  □ Implementar command router (precio, catálogo, cotizar)
  □ Testing interno con team CGS
  □ Decisión: Baileys vs WA Business API
  □ Go live con bot

Semana 8-10 (Etapa 3):
  □ Docker Compose n8n en VPS
  □ Crear App en Meta for Developers
  □ Configurar workflows en n8n
  □ Testing con posts de prueba
  □ Go live
```

---

## 9. Etapa 4 (Futuro): CRM Mínimo

Una vez que el sistema de leads del bot esté activo, la tabla `leads` en Supabase se convierte en el núcleo de un CRM mínimo:

```sql
leads (
  id          bigint PK
  phone       text          -- número de WhatsApp
  name        text          -- nombre capturado
  product_query text        -- qué consultó
  status      text          -- new | contacted | closed | lost
  assignee    text          -- vendedor asignado
  notes       text
  created_at  timestamptz
  updated_at  timestamptz
)
```

Panel de CRM: puede construirse como una sección adicional en `admin.html` o como una aplicación separada con React + Supabase (siguiente iteración de la plataforma).

---

*Para la presentación ejecutiva sin detalles técnicos, ver `docs/PROPUESTA_EJECUTIVA.md`*
