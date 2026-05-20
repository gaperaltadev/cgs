# Automatización CGS Paraguay — n8n

## Estrategia

Cada vez que se agrega o actualiza un producto en el catálogo, n8n publica automáticamente en Instagram y Facebook. Adicionalmente, cada semana publica una selección de productos destacados.

```
Supabase (productos)
      │
      │ Webhook (INSERT / UPDATE)
      ▼
    n8n
      ├──► Facebook Page (Graph API)
      └──► Instagram Business (Graph API)

Cron semanal (lunes 10:00)
      │
      ▼
    n8n ──► GET productos destacados de Supabase
          ├──► Facebook
          └──► Instagram
```

---

## Workflows implementados

| Archivo | Trigger | Descripción |
|---------|---------|-------------|
| `nuevo-producto.json` | Supabase Webhook INSERT | Publica el nuevo producto en ambas redes |
| `producto-actualizado.json` | Supabase Webhook UPDATE | Publica actualización si el producto es featured |
| `post-semanal.json` | Cron lunes 10:00 | Publica los productos con badge en ambas redes |

---

## Setup — paso a paso

### 1. n8n

**Opción A — n8n Cloud (recomendado para empezar)**
1. Crear cuenta en https://app.n8n.cloud (plan gratuito incluye 5 workflows activos)
2. Importar los JSON desde `n8n-workflows/`

**Opción B — Docker en VPS**
```bash
docker run -d --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=CAMBIAR \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

---

### 2. Meta API (Facebook + Instagram)

1. Ir a https://developers.facebook.com → crear App → tipo **Business**
2. Agregar productos: **Instagram Graph API** + **Pages API**
3. En la App, ir a **Graph API Explorer** y obtener un User Access Token con permisos:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_content_publish`
4. Convertir a **Long-Lived Token** (válido 60 días):
   ```
   GET https://graph.facebook.com/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id=APP_ID
     &client_secret=APP_SECRET
     &fb_exchange_token=SHORT_LIVED_TOKEN
   ```
5. Obtener el Page Access Token (no expira):
   ```
   GET https://graph.facebook.com/me/accounts?access_token=LONG_LIVED_USER_TOKEN
   ```
6. Obtener el Instagram Business Account ID vinculado a la página:
   ```
   GET https://graph.facebook.com/PAGE_ID?fields=instagram_business_account&access_token=PAGE_TOKEN
   ```

---

### 3. Supabase Webhook

1. Supabase Dashboard → **Database → Webhooks → Create a new hook**
2. Configurar:
   - **Name**: `n8n-producto-nuevo`
   - **Table**: `products`
   - **Events**: `INSERT`
   - **Type**: HTTP Request
   - **URL**: `https://TU_N8N.app.n8n.cloud/webhook/cgs-producto-nuevo`
   - **Method**: POST
3. Repetir para UPDATE con URL `cgs-producto-actualizado`

---

### 4. Variables en n8n

En cada workflow, reemplazar las credenciales (o usar n8n Credentials):

| Variable | Dónde obtenerla |
|----------|-----------------|
| `FACEBOOK_PAGE_ID` | URL de tu página de Facebook |
| `INSTAGRAM_ACCOUNT_ID` | Paso 6 del setup Meta |
| `META_ACCESS_TOKEN` | Page Access Token (paso 5) |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → service_role |

---

## Formato del post generado

```
🆕 Nuevo en catálogo CGS Paraguay

[NOMBRE PRODUCTO]
[TECNOLOGÍA] • [VISCOSIDAD]

[DESCRIPCIÓN — primeros 200 caracteres]

✅ [SPECS]
📦 Presentaciones: [LISTA]

📞 Consultá por WhatsApp: wa.me/595994443113
🌐 Ver catálogo completo: cgs-paraguay.netlify.app

#CGSParaguay #YPF #Lubricantes #[CATEGORIA]
```

---

## Costos

| Servicio | Plan | Costo |
|----------|------|-------|
| n8n Cloud | Starter | USD 0 (hasta 5 workflows) |
| Meta API | Graph API | Gratis |
| Supabase Webhooks | Incluido en Free tier | Gratis |
| **Total** | | **USD 0/mes** |
