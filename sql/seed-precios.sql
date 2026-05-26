-- ══════════════════════════════════════════════════════════════════════════
-- Carga masiva de precios USD por presentación
-- Solo aplica a presentaciones en litros (1L, 4L, 20L, 208L).
-- Las otras unidades (kg, unidad, galón, etc.) se cargan a mano desde el admin.
-- Ejecutar en Supabase SQL Editor.
--
-- IMPORTANTE: solo actualiza filas con price_usd = 0 para no pisar
-- precios ya cargados. Cambiar a `AND pp.price_usd >= 0` para forzar todo.
-- ══════════════════════════════════════════════════════════════════════════

WITH matriz (patron, label, precio) AS (
  VALUES
  -- ── ELAION (motores livianos) ──────────────────────────────────────────
  -- F10 5W-30 (referencia del admin)
  ('ELAION F10%',     '1L',      5.50),
  ('ELAION F10%',     '4L',     12.00),
  ('ELAION F10%',     '20L',    42.30),
  ('ELAION F10%',     '208L',  145.75),

  -- F30 5W-40
  ('ELAION F30%',     '1L',      5.80),
  ('ELAION F30%',     '4L',     13.00),
  ('ELAION F30%',     '20L',    45.00),
  ('ELAION F30%',     '208L',  155.00),

  -- F50 0W-40 (full sintético — premium)
  ('ELAION F50%',     '1L',      7.50),
  ('ELAION F50%',     '4L',     18.00),
  ('ELAION F50%',     '20L',    60.00),
  ('ELAION F50%',     '208L',  210.00),

  -- SUV
  ('ELAION SUV%',     '1L',      6.00),
  ('ELAION SUV%',     '4L',     14.00),
  ('ELAION SUV%',     '20L',    48.00),
  ('ELAION SUV%',     '208L',  165.00),

  -- ── EXTRAVIDA (motores pesados/diesel) ────────────────────────────────
  ('EXTRAVIDA%',      '1L',      4.50),
  ('EXTRAVIDA%',      '4L',     10.00),
  ('EXTRAVIDA%',      '20L',    38.00),
  ('EXTRAVIDA%',      '208L',  130.00),

  -- ── RÖD (motos) ───────────────────────────────────────────────────────
  ('RÖD%',            '1L',      5.00),
  ('RÖD%',            '4L',     11.50),
  ('RÖD%',            '20L',    40.00),
  ('RÖD%',            '208L',  140.00),

  -- ── Otros productos ───────────────────────────────────────────────────
  -- Hidráulico AW68
  ('Hidráulico%',     '1L',      3.80),
  ('Hidráulico%',     '4L',      8.50),
  ('Hidráulico%',     '20L',    32.00),
  ('Hidráulico%',     '208L',  110.00)
)
UPDATE product_presentations pp
SET
  price_usd  = m.precio,
  updated_at = now()
FROM matriz m, products pr
WHERE pr.id    =      pp.product_id
  AND pr.name  ILIKE  m.patron
  AND pp.label =      m.label
  AND pp.price_usd = 0          -- no pisar precios ya cargados
  AND m.precio > 0;

-- ── Verificar resultado ───────────────────────────────────────────────────
SELECT
  pr.name        AS producto,
  pp.label       AS presentacion,
  pp.price_usd   AS precio_usd,
  pp.active
FROM product_presentations pp
JOIN products pr ON pr.id = pp.product_id
ORDER BY pr.name, pp.sort_order;
