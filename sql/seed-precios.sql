-- ══════════════════════════════════════════════════════════════════════════
-- Precios USD por presentación — script único definitivo
-- Pisa todos los precios existentes. Ejecutar en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════

WITH matriz (patron, label, precio) AS (
  VALUES
  -- ── ELAION F10 5W-30 · mineral (referencia) ───────────────────────────
  ('ELAION F10%',        '1L',      5.50),
  ('ELAION F10%',        '4L',     12.00),
  ('ELAION F10%',        '20L',    42.30),
  ('ELAION F10%',        '208L',  145.75),

  -- ── ELAION F30 5W-40 · semi-sintético ────────────────────────────────
  ('ELAION F30%',        '1L',      5.80),
  ('ELAION F30%',        '4L',     13.00),
  ('ELAION F30%',        '20L',    45.00),
  ('ELAION F30%',        '208L',  155.00),

  -- ── ELAION F50 0W-40 · full sintético premium ─────────────────────────
  ('ELAION F50%',        '1L',      7.50),
  ('ELAION F50%',        '4L',     18.00),
  ('ELAION F50%',        '20L',    60.00),
  ('ELAION F50%',        '208L',  210.00),

  -- ── ELAION SUV · semi-sintético tracción total ────────────────────────
  ('ELAION SUV%',        '1L',      6.00),
  ('ELAION SUV%',        '4L',     14.00),
  ('ELAION SUV%',        '20L',    48.00),
  ('ELAION SUV%',        '208L',  165.00),

  -- ── ELAION MI · mineral económico ────────────────────────────────────
  ('ELAION MI%',         '1L',      4.80),
  ('ELAION MI%',         '4L',     10.50),
  ('ELAION MI%',         '20L',    38.00),
  ('ELAION MI%',         '208L',  130.00),

  -- ── ELAION FS · full sintético alta performance ───────────────────────
  ('ELAION FS%',         '1L',      8.00),
  ('ELAION FS%',         '4L',     20.00),
  ('ELAION FS%',         '20L',    68.00),
  ('ELAION FS%',         '208L',  235.00),

  -- ── ELAION TS · transmisiones ────────────────────────────────────────
  ('ELAION TS%',         '1L',      5.90),
  ('ELAION TS%',         '4L',     13.50),
  ('ELAION TS%',         '20L',    46.00),
  ('ELAION TS%',         '208L',  158.00),

  -- ── ELAION AURO · línea tope europea/asiática ─────────────────────────
  ('ELAION AURO%',       '1L',      9.50),
  ('ELAION AURO%',       '4L',     24.00),
  ('ELAION AURO%',       '20L',    82.00),
  ('ELAION AURO%',       '208L',  285.00),

  -- ── EXTRAVIDA XV · mineral pesado ────────────────────────────────────
  ('EXTRAVIDA XV%',      '1L',      4.00),
  ('EXTRAVIDA XV%',      '4L',      9.00),
  ('EXTRAVIDA XV%',      '20L',    34.00),
  ('EXTRAVIDA XV%',      '208L',  115.00),

  -- ── EXTRAVIDA XVT · semi-sintético pesado ────────────────────────────
  ('EXTRAVIDA XVT%',     '1L',      5.00),
  ('EXTRAVIDA XVT%',     '4L',     11.50),
  ('EXTRAVIDA XVT%',     '20L',    42.00),
  ('EXTRAVIDA XVT%',     '208L',  145.00),

  -- ── EXTRAVIDA XVA · agrícola / tractores ─────────────────────────────
  ('EXTRAVIDA XVA%',     '1L',      4.50),
  ('EXTRAVIDA XVA%',     '4L',     10.00),
  ('EXTRAVIDA XVA%',     '20L',    37.00),
  ('EXTRAVIDA XVA%',     '208L',  125.00),

  -- ── EXTRAVIDA XVI · industrial ───────────────────────────────────────
  ('EXTRAVIDA XVI%',     '1L',      4.20),
  ('EXTRAVIDA XVI%',     '4L',      9.50),
  ('EXTRAVIDA XVI%',     '20L',    35.50),
  ('EXTRAVIDA XVI%',     '208L',  120.00),

  -- ── RÖD 4T · moto cuatro tiempos ─────────────────────────────────────
  ('%RÖD 4T%',           '1L',      5.20),
  ('%RÖD 4T%',           '4L',     12.00),
  ('%RÖD 4T%',           '20L',    41.00),
  ('%RÖD 4T%',           '208L',  141.00),

  -- ── RÖD 2T · moto dos tiempos ────────────────────────────────────────
  ('%RÖD 2T%',           '1L',      5.00),
  ('%RÖD 2T%',           '4L',     11.00),
  ('%RÖD 2T%',           '20L',    39.00),
  ('%RÖD 2T%',           '208L',  135.00),

  -- ── RÖD CADENAS · lubricante de cadenas ──────────────────────────────
  ('%RÖD CADENAS%',      '300ml',   6.50),

  -- ── Hidráulico AW68 ──────────────────────────────────────────────────
  ('Hidráulico%',        '1L',      3.80),
  ('Hidráulico%',        '4L',      8.50),
  ('Hidráulico%',        '20L',    32.00),
  ('Hidráulico%',        '208L',  110.00),

  -- ── KRIOX Refrigerante ────────────────────────────────────────────────
  ('KRIOX%',             '1L',      3.50),
  ('KRIOX%',             '4L',      8.00),
  ('KRIOX%',             '20L',    28.00),
  ('KRIOX%',             '208L',   95.00),

  -- ── Líquido de Frenos (presentaciones chicas) ─────────────────────────
  ('Líquido de Frenos%', '0.5L',    8.50),
  ('Líquido de Frenos%', '1L',     14.00)

  -- Grasa EP2: se vende en kg → cargar a mano desde el admin
)
UPDATE product_presentations pp
SET
  price_usd  = m.precio,
  updated_at = now()
FROM matriz m, products pr
WHERE pr.id        = pp.product_id
  AND pr.name ILIKE m.patron
  AND pp.label     = m.label;

-- ── Verificar resultado ───────────────────────────────────────────────────
SELECT
  pr.name      AS producto,
  pp.label     AS presentacion,
  pp.price_usd AS precio_usd,
  pp.active
FROM product_presentations pp
JOIN products pr ON pr.id = pp.product_id
ORDER BY pr.name, pp.sort_order;
