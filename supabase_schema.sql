-- ═══════════════════════════════════════════════════
-- CGS Paraguay – Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ═══════════════════════════════════════════════════

-- Tabla de productos
create table if not exists products (
  id            bigint generated always as identity primary key,
  name          text    not null,
  category      text    not null check (category in ('elaion', 'extravida', 'moto', 'otros')),
  technology    text    not null default '',
  description   text             default '',
  specs         text             default '',
  viscosity     text             default 'N/A',
  presentations text[]           default '{}',
  applications  text[]           default '{}',
  vehicle_type  text             default 'auto',
  image         text,
  featured      boolean          default false,
  badge         text,
  sort_order    integer          default 0,
  created_at    timestamptz      default now(),
  updated_at    timestamptz      default now()
);

-- Actualizar updated_at automáticamente
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();

-- Row Level Security: público puede leer, solo admins autenticados pueden escribir
alter table products enable row level security;

create policy "products_public_read" on products
  for select using (true);

create policy "products_admin_all" on products
  for all using (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════
-- INSTRUCCIONES PARA POBLAR CON LOS DATOS INICIALES
-- ═══════════════════════════════════════════════════
-- Después de ejecutar este schema:
-- 1. Ir al panel Admin: https://cgs-paraguay.netlify.app/admin.html
-- 2. Iniciar sesión con las credenciales actuales (admin / cgs2024)
-- 3. Usar el botón "Restaurar predeterminados" para cargar los 19 productos
--    a Supabase automáticamente.
--
-- ALTERNATIVA: insertar directamente con la herramienta de migración
-- (ver docs/PROPUESTA_TECNICA.md sección Migración de datos)
-- ═══════════════════════════════════════════════════

-- Crear usuario administrador (ejecutar separado en SQL Editor)
-- Reemplazar email y password con los datos reales:
--
-- select auth.sign_up(
--   'admin@cgs.com.py',   -- email del administrador
--   'contraseña_segura'   -- mínimo 8 caracteres
-- );
