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
  -- ══ ELAION — motores livianos ══════════════════════════════════════════

  -- F10 5W-30 · mineral (referencia del admin)
  ('ELAION F10%',       '1L',      5.50),
  ('ELAION F10%',       '4L',     12.00),
  ('ELAION F10%',       '20L',    42.30),
  ('ELAION F10%',       '208L',  145.75),

  -- F30 5W-40 · semi-sintético
  ('ELAION F30%',       '1L',      5.80),
  ('ELAION F30%',       '4L',     13.00),
  ('ELAION F30%',       '20L',    45.00),
  ('ELAION F30%',       '208L',  155.00),

  -- F50 0W-40 · full sintético premium
  ('ELAION F50%',       '1L',      7.50),
  ('ELAION F50%',       '4L',     18.00),
  ('ELAION F50%',       '20L',    60.00),
  ('ELAION F50%',       '208L',  210.00),

  -- SUV · semi-sintético tracción total
  ('ELAION SUV%',       '1L',      6.00),
  ('ELAION SUV%',       '4L',     14.00),
  ('ELAION SUV%',       '20L',    48.00),
  ('ELAION SUV%',       '208L',  165.00),

  -- MI · mineral económico (debajo del F10)
  ('ELAION MI%',        '1L',      4.80),
  ('ELAION MI%',        '4L',     10.50),
  ('ELAION MI%',        '20L',    38.00),
  ('ELAION MI%',        '208L',  130.00),

  -- FS · full sintético alta performance (entre F50 y AURO)
  ('ELAION FS%',        '1L',      8.00),
  ('ELAION FS%',        '4L',     20.00),
  ('ELAION FS%',        '20L',    68.00),
  ('ELAION FS%',        '208L',  235.00),

  -- TS · transmisiones (viscosidad diferente, precio similar a F30)
  ('ELAION TS%',        '1L',      5.90),
  ('ELAION TS%',        '4L',     13.50),
  ('ELAION TS%',        '20L',    46.00),
  ('ELAION TS%',        '208L',  158.00),

  -- AURO · línea tope (full sintético especificación europea/asiática)
  ('ELAION AURO%',      '1L',      9.50),
  ('ELAION AURO%',      '4L',     24.00),
  ('ELAION AURO%',      '20L',    82.00),
  ('ELAION AURO%',      '208L',  285.00),

  -- ══ EXTRAVIDA — motores pesados / diesel ══════════════════════════════
  -- XV · mineral (la línea más económica de pesados)
  ('EXTRAVIDA XV%',     '1L',      4.00),
  ('EXTRAVIDA XV%',     '4L',      9.00),
  ('EXTRAVIDA XV%',     '20L',    34.00),
  ('EXTRAVIDA XV%',     '208L',  115.00),

  -- XVT · semi-sintético (CK-4/SN, mayor intervalo de cambio)
  ('EXTRAVIDA XVT%',    '1L',      5.00),
  ('EXTRAVIDA XVT%',    '4L',     11.50),
  ('EXTRAVIDA XVT%',    '20L',    42.00),
  ('EXTRAVIDA XVT%',    '208L',  145.00),

  -- XVA · agrícola / tractores (GL-4/GL-5 multipropósito)
  ('EXTRAVIDA XVA%',    '1L',      4.50),
  ('EXTRAVIDA XVA%',    '4L',     10.00),
  ('EXTRAVIDA XVA%',    '20L',    37.00),
  ('EXTRAVIDA XVA%',    '208L',  125.00),

  -- XVI · industrial / equipos estacionarios
  ('EXTRAVIDA XVI%',    '1L',      4.20),
  ('EXTRAVIDA XVI%',    '4L',      9.50),
  ('EXTRAVIDA XVI%',    '20L',    35.50),
  ('EXTRAVIDA XVI%',    '208L',  120.00),

  -- ══ RÖD — lubricantes para motos ══════════════════════════════════════
  -- 4T · motor cuatro tiempos (similar a ELAION F30 en precio)
  ('RÖD 4T%',           '1L',      5.20),
  ('RÖD 4T%',           '4L',     12.00),
  ('RÖD 4T%',           '20L',    41.00),
  ('RÖD 4T%',           '208L',  141.00),

  -- 2T · motor dos tiempos (menor viscosidad, precio similar a F10)
  ('RÖD 2T%',           '1L',      5.00),
  ('RÖD 2T%',           '4L',     11.00),
  ('RÖD 2T%',           '20L',    39.00),
  ('RÖD 2T%',           '208L',  135.00),

  -- ══ Otros lubricantes y fluidos ═══════════════════════════════════════
  -- Hidráulico AW68 (aceite mineral para sistemas hidráulicos)
  ('Hidráulico%',       '1L',      3.80),
  ('Hidráulico%',       '4L',      8.50),
  ('Hidráulico%',       '20L',    32.00),
  ('Hidráulico%',       '208L',  110.00),

  -- KRIOX Refrigerante (anticongelante concentrado / listo para usar)
  ('KRIOX%',            '1L',      3.50),
  ('KRIOX%',            '4L',      8.00),
  ('KRIOX%',            '20L',    28.00),
  ('KRIOX%',            '208L',   95.00),

  -- Líquido de Frenos DOT3/DOT4 (fluido higroscópico, presentaciones chicas)
  ('Líquido de Frenos%','0.5L',    8.50),
  ('Líquido de Frenos%','1L',     14.00)

  -- Grasa EP2: se vende en kg → cargar a mano desde el admin
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
