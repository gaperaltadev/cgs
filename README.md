# CGS Landing — Sitio Web Corporativo

Sitio web corporativo para **CGS Paraguay**, representante oficial de YPF en Paraguay. Presenta el catálogo de lubricantes, una guía de recomendación de productos y canales de contacto directo.

## Descripción

Landing page estática construida con HTML, CSS y JavaScript vanilla. Incluye:

- Catálogo completo de productos YPF con filtros por categoría
- Guía interactiva de lubricación por tipo de vehículo (auto, moto, camión)
- Sección de empresa y contacto con mapa embebido
- Panel de administración para gestión local del catálogo
- Diseño responsive (mobile-first)

## Estructura del proyecto

```
cgs-landing/
├── index.html          # Sitio público
├── admin.html          # Panel de administración
├── css/
│   └── style.css       # Estilos (sitio público + admin)
├── js/
│   ├── data.js         # Datos del catálogo y gestión de storage
│   ├── app.js          # Lógica del sitio público
│   └── admin.js        # Lógica del panel de administración
└── assets/
    └── hero.webp       # Imagen principal
```

## Stack tecnológico

- HTML5 semántico
- CSS3 con variables custom (sin frameworks)
- JavaScript ES6+ vanilla (sin dependencias ni build tools)
- Google Fonts (Inter)
- `localStorage` para persistencia de datos en cliente

## Deployment

El proyecto es completamente estático. No requiere servidor ni proceso de build.

Compatible con: **GitHub Pages**, **Netlify**, **Vercel**, cualquier hosting estático.

### Deploy en Netlify / Vercel

1. Conectar el repositorio
2. No configurar build command ni output directory (raíz del proyecto)
3. Publicar

### Deploy manual

Copiar todos los archivos a cualquier servidor web o bucket S3/similar con hosting estático habilitado.

## Actualizar el catálogo de productos

Los datos del catálogo viven en `js/data.js` en el array `DEFAULTS`. Para actualizar productos en producción:

1. Editar los productos en `DEFAULTS` dentro de `js/data.js`
2. Incrementar la constante `DATA_VERSION` (ej: `'1.0.0'` → `'1.1.0'`)
3. Hacer commit y redeploy

> El panel de administración (`/admin.html`) permite editar productos localmente en el navegador, pero los cambios **no se sincronizan** al sitio público ni a otros usuarios. Sirve para previsualización local.

## Panel de administración

Accesible en `/admin.html`. Requiere autenticación.

- Credenciales por defecto: `admin` / `cgs2024`
- Se recomienda cambiar la contraseña desde **Configuración** antes de hacer público el sitio
- Los datos de sesión se almacenan en `sessionStorage`

> Las credenciales cambiadas desde el panel persisten únicamente en el navegador local. Ver nota sobre persistencia de datos.

## Configuración de WhatsApp

El número de WhatsApp y el mensaje predeterminado se pueden cambiar desde el panel de administración en **Configuración → WhatsApp**. Los cambios persisten en `localStorage` del navegador.

Para actualizar el número en el código fuente (recomendado para producción):

- `js/app.js` — constante `DEFAULT_WA.waNumber`
- `js/admin.js` — constante `DEFAULT_WA_CFG.waNumber`

## Información de contacto (hardcodeada)

| Campo | Valor |
|-------|-------|
| Dirección | Av. Madame Lynch, Asunción, Paraguay |
| Teléfono | +595 21 673 395 |
| Email | ventas@cgs.com.py |
| WhatsApp | +595 994 443 113 |

Para actualizar: editar directamente en `index.html` (sección `#contacto`) y `css/style.css`.

## Pendientes antes de producción

- [ ] Agregar imágenes de productos (campo `image` en `js/data.js`)
- [ ] Actualizar coordenadas del mapa de Google Maps en `index.html`
- [ ] Completar links de redes sociales en el footer
- [ ] Cambiar credenciales de administrador por defecto
- [ ] Verificar y actualizar toda la información de contacto

## Licencia

Uso privado — CGS Paraguay. Todos los derechos reservados.
