# Panel admin — guía rápida

Extensión del panel admin existente (`admin.html`) con las nuevas tablas
del bot: vendedores, clientes, pedidos y guía de vehículos.

## Activación (una sola vez)

### 1. Aplicar políticas RLS

Ejecutar en Supabase SQL Editor:

```
cgs-bot/sql/08-admin-policies.sql
```

Esto permite a usuarios autenticados leer/escribir las tablas de admin.
El bot sigue usando `service_role` y no se ve afectado.

### 2. Verificar que el sign-up esté deshabilitado

**Supabase → Authentication → Providers → Email** →
"Enable email signups" debe estar **OFF**.

Esto es crítico: como ahora cualquier usuario autenticado puede hacer
CRUD, no queremos que nadie pueda crearse una cuenta.

### 3. Crear el usuario admin

**Supabase → Authentication → Users → Add user** → email + password.

Este es el usuario con el que se logueará el admin en
[https://cgs-paraguay.netlify.app/admin.html](https://cgs-paraguay.netlify.app/admin.html).

## Tabs

### Productos
Lo que ya existía. Sin cambios.

### Guía de Vehículos
CRUD completo de la tabla `vehicle_guide`. Al crear/editar:
- Marca y modelo son obligatorios
- Año desde/hasta son opcionales (NULL = sin restricción)
- Producto recomendado es obligatorio; alternativa es opcional
- Las notas técnicas son texto libre (ej: "Motor 1.8L 2ZR-FE")

### Vendedores
CRUD de la tabla `vendedores`. Quién puede usar el bot.
- El teléfono es el ID (no se puede cambiar después de crear)
- Las categorías que tiene asignadas determinan qué notificaciones
  recibirá en FASE 3 (alertas de stock)
- **Para dar de baja:** marcar como inactivo en vez de borrar. Eliminar
  fila falla si tiene pedidos asociados (FK)
- El bot detecta los cambios en máximo 5 minutos (cache de `isAllowed`)

### Clientes
CRUD de la tabla `clientes`. Útil para:
- Corregir typos en razones sociales que se cargaron desde el bot
- Pre-cargar clientes habituales antes de la primera visita
- Agregar contacto / teléfono / notas
- El RUC es el ID y no se puede cambiar después de crear

### Pedidos
Read-only. Los pedidos se crean exclusivamente desde el bot vía
RPC transaccional. El admin puede:
- Ver listado filtrado por período (hoy/semana/mes/todo)
- Buscar por cliente, RUC o vendedor
- Click en el ojo para ver detalle: items, cantidades, notas

## Arquitectura

```
admin.html
  ├── js/admin.js              — auth + productos + tabs + helpers
  ├── js/admin-vehiculos.js    — CRUD vehicle_guide
  ├── js/admin-vendedores.js   — CRUD vendedores
  ├── js/admin-clientes.js     — CRUD clientes
  └── js/admin-pedidos.js      — read-only pedidos
```

Cada módulo registra `window.AdminXxx = { init, refresh, openAdd }`.
`admin.js` los invoca via lazy-init la primera vez que se entra a la
pestaña, y llama `refresh()` al volver.

Todos los módulos comparten `window.adminDb` (cliente Supabase
autenticado, creado en `admin.js` al cargar).
