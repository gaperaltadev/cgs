-- ══════════════════════════════════════════════════════════════════════════
-- Carga inicial de precios USD — líneas base
-- ELAION F10/F30/F50/SUV · EXTRAVIDA · RÖD · Hidráulico
-- Ejecutar en Supabase SQL Editor.
-- Solo actualiza filas con price_usd = 0.
-- ══════════════════════════════════════════════════════════════════════════

WITH matriz (patron, label, precio) AS (
  VALUES
  ('ELAION F10%',  '1L',      5.50),
  ('ELAION F10%',  '4L',     12.00),
  ('ELAION F10%',  '20L',    42.30),
  ('ELAION F10%',  '208L',  145.75),

  ('ELAION F30%',  '1L',      5.80),
  ('ELAION F30%',  '4L',     13.00),
  ('ELAION F30%',  '20L',    45.00),
  ('ELAION F30%',  '208L',  155.00),

  ('ELAION F50%',  '1L',      7.50),
  ('ELAION F50%',  '4L',     18.00),
  ('ELAION F50%',  '20L',    60.00),
  ('ELAION F50%',  '208L',  210.00),

  ('ELAION SUV%',  '1L',      6.00),
  ('ELAION SUV%',  '4L',     14.00),
  ('ELAION SUV%',  '20L',    48.00),
  ('ELAION SUV%',  '208L',  165.00),

  ('EXTRAVIDA%',   '1L',      4.50),
  ('EXTRAVIDA%',   '4L',     10.00),
  ('EXTRAVIDA%',   '20L',    38.00),
  ('EXTRAVIDA%',   '208L',  130.00),

  ('RÖD%',         '1L',      5.00),
  ('RÖD%',         '4L',     11.50),
  ('RÖD%',         '20L',    40.00),
  ('RÖD%',         '208L',  140.00),

  ('Hidráulico%',  '1L',      3.80),
  ('Hidráulico%',  '4L',      8.50),
  ('Hidráulico%',  '20L',    32.00),
  ('Hidráulico%',  '208L',  110.00)
)
UPDATE product_presentations pp
SET
  price_usd  = m.precio,
  updated_at = now()
FROM matriz m, products pr
WHERE pr.id        = pp.product_id
  AND pr.name ILIKE m.patron
  AND pp.label     = m.label
  AND pp.price_usd = 0
  AND m.precio     > 0;

SELECT pr.name, pp.label, pp.price_usd, pp.active
FROM product_presentations pp
JOIN products pr ON pr.id = pp.product_id
ORDER BY pr.name, pp.sort_order;
