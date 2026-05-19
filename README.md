# CGS Landing — Sitio Web Corporativo

Sitio web corporativo para **CGS Paraguay**, representante oficial de YPF en Paraguay. Presenta el catálogo de lubricantes, una guía de recomendación de productos y canales de contacto directo.

## Descripción

Landing page estática construida con HTML, CSS y JavaScript vanilla. Incluye:

- Catálogo de 16 productos YPF con imágenes y filtros por categoría (ELAION, EXTRAVIDA, RÖD, Otros)
- Guía interactiva de lubricación por tipo de vehículo (auto, moto, camión)
- Sección de empresa y contacto con mapa embebido de Google Maps
- Panel de administración para gestión local del catálogo
- Diseño responsive (mobile-first)
- Analítica web integrada (Google Analytics 4)
- Favicon con logo YPF

## Estructura del proyecto

```
cgs-landing/
├── index.html              # Sitio público
├── admin.html              # Panel de administración (no indexado)
├── css/
│   └── style.css           # Estilos (sitio público + admin)
├── js/
│   ├── data.js             # Datos del catálogo y gestión de storage
│   ├── app.js              # Lógica del sitio público
│   └── admin.js            # Lógica del panel de administración
└── assets/
    ├── hero.webp           # Imagen principal del hero
    ├── ypf_logoazul.svg    # Logo YPF (favicon)
    └── products/
        ├── *.webp          # Imágenes de productos
        └── fichas/
            └── *.pdf       # Fichas técnicas de productos
```

## Stack tecnológico

- HTML5 semántico
- CSS3 con variables custom (sin frameworks)
- JavaScript ES6+ vanilla (sin dependencias ni build tools)
- Google Fonts (Inter)
- Google Analytics 4
- `localStorage` para persistencia de datos en cliente

## Deployment

El proyecto es completamente estático. No requiere servidor ni proceso de build.

Repositorio: [github.com/gaperaltadev/cgs](https://github.com/gaperaltadev/cgs)

Compatible con: **Netlify**, **Vercel**, **GitHub Pages**, cualquier hosting estático.

### Deploy en Netlify (recomendado)

1. Conectar el repositorio desde [netlify.com](https://netlify.com)
2. Dejar **Build command** y **Publish directory** vacíos (raíz del proyecto)
3. Publicar

### Deploy manual

Copiar todos los archivos a cualquier servidor web o bucket S3/similar con hosting estático habilitado.

## Actualizar el catálogo de productos

Los datos del catálogo viven en [js/data.js](js/data.js) en el array `DEFAULTS`. Para actualizar productos en producción:

1. Editar los productos en `DEFAULTS` dentro de `js/data.js`
2. Incrementar la constante `DATA_VERSION` (ej: `'1.1.0'` → `'1.2.0'`)
3. Hacer commit y redeploy

Las imágenes de productos se ubican en `assets/products/`. Usar formato `.webp` para mejor rendimiento.

> El panel de administración (`/admin.html`) permite editar productos localmente en el navegador, pero los cambios **no se sincronizan** al sitio público ni a otros usuarios. Sirve para previsualización local.

## Panel de administración

Accesible en `/admin.html`. Requiere autenticación. **No está enlazado desde el sitio público.**

- Las credenciales por defecto deben cambiarse desde **Configuración** antes del primer uso en producción
- Los datos de sesión se almacenan en `sessionStorage`

> Las credenciales cambiadas desde el panel persisten únicamente en el navegador local.

## Configuración de WhatsApp

El número y mensaje predeterminado se pueden cambiar desde el panel en **Configuración → WhatsApp**.

Para actualizar en el código fuente (recomendado para producción):

- [js/app.js](js/app.js) — constante `DEFAULT_WA.waNumber`
- [js/admin.js](js/admin.js) — constante `DEFAULT_WA_CFG.waNumber`

## Información de contacto

La información de contacto está hardcodeada en `index.html` (sección `#contacto`) y en el footer. Para actualizar, editar directamente en el HTML.

Campos: dirección, teléfono, email, WhatsApp, links de redes sociales.

## Analytics

Google Analytics 4 está integrado en `index.html`. El panel de administración no trackea visitas para mantener los datos limpios.

Para ver reportes: [analytics.google.com](https://analytics.google.com)

## Pendientes post-lanzamiento

- [ ] Confirmar con CGS los productos activos y ajustar catálogo si corresponde
- [ ] Cambiar credenciales del panel de administración por defecto
- [ ] Apuntar dominio propio (cgs.com.py) en Netlify

## Licencia

Uso privado — CGS Paraguay. Todos los derechos reservados.
