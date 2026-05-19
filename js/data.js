'use strict';

const CGS = (() => {
  const STORAGE_KEY  = 'cgs_products_v1';
  const VERSION_KEY  = 'cgs_data_version';
  const DATA_VERSION = '1.2.0';

  /* ── Supabase ──────────────────────────────────────────────────────
   * 1. Crear proyecto en https://supabase.com
   * 2. Ejecutar supabase_schema.sql en el SQL Editor de Supabase
   * 3. Pegar las claves de Settings > API aquí:
   * ────────────────────────────────────────────────────────────────── */
  const SUPABASE_URL  = '';   // ej: https://xyzabcde.supabase.co
  const SUPABASE_ANON = '';   // ej: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

  const _db = (SUPABASE_URL && SUPABASE_ANON && typeof window.supabase !== 'undefined')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
    : null;

  /* ── Row mapping ───────────────────────────────────────────────── */
  function _fromRow(r) {
    return {
      id:            r.id,
      name:          r.name,
      category:      r.category,
      technology:    r.technology   || '',
      description:   r.description || '',
      specs:         r.specs        || '',
      viscosity:     r.viscosity    || 'N/A',
      presentations: Array.isArray(r.presentations) ? r.presentations : [],
      applications:  Array.isArray(r.applications)  ? r.applications  : [],
      vehicleType:   r.vehicle_type || 'auto',
      image:         r.image        || null,
      featured:      r.featured     || false,
      badge:         r.badge        || null
    };
  }

  function _toRow(p) {
    return {
      name:          p.name,
      category:      p.category,
      technology:    p.technology   || '',
      description:   p.description || '',
      specs:         p.specs        || '',
      viscosity:     p.viscosity    || 'N/A',
      presentations: Array.isArray(p.presentations) ? p.presentations : [],
      applications:  Array.isArray(p.applications)  ? p.applications  : [],
      vehicle_type:  p.vehicleType  || 'auto',
      image:         p.image        || null,
      featured:      p.featured     || false,
      badge:         p.badge        || null,
      sort_order:    p.id           || 0
    };
  }

  /* ── Normalize form input ──────────────────────────────────────── */
  function _normalize(product) {
    const p = { ...product };
    if (!Array.isArray(p.presentations)) {
      p.presentations = p.presentations
        ? p.presentations.split(',').map(s => s.trim()).filter(Boolean) : [];
    }
    if (!Array.isArray(p.applications)) {
      p.applications = p.applications
        ? p.applications.split(',').map(s => s.trim()).filter(Boolean) : [];
    }
    return p;
  }

  /* ── Refresh localStorage from Supabase ────────────────────────── */
  async function _syncFromDB() {
    const { data, error } = await _db
      .from('products')
      .select('*')
      .order('sort_order')
      .order('id');
    if (!error && data) {
      _saveLocal(data.map(_fromRow));
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
    }
  }

  /* ── Defaults ──────────────────────────────────────────────────── */
  const DEFAULTS = [
    {
      id: 1,
      name: "ELAION F10 5W-30",
      category: "elaion",
      technology: "Semi-Sintético",
      description: "Lubricante semi-sintético de alta performance para motores nafteros y diesel modernos. La tecnología TEC proporciona máxima protección desde el arranque en frío, reduciendo el desgaste hasta un 40%.",
      specs: "API SN/CF • ACEA A3/B4",
      viscosity: "5W-30",
      presentations: ["1L", "4L", "20L", "208L"],
      applications: ["Automóviles", "SUV", "Camionetas"],
      vehicleType: "auto",
      image: "./assets/products/Elaion_FS530.webp",
      featured: true,
      badge: "MÁS VENDIDO"
    },
    {
      id: 2,
      name: "ELAION F10 10W-40",
      category: "elaion",
      technology: "Semi-Sintético",
      description: "Formulado para motores que requieren mayor viscosidad. Ideal para climas cálidos y motores con mayor kilometraje. Excelente relación costo-beneficio con protección superior.",
      specs: "API SN/CF • ACEA A3/B4",
      viscosity: "10W-40",
      presentations: ["1L", "4L", "20L", "208L"],
      applications: ["Automóviles", "SUV", "Camionetas"],
      vehicleType: "auto",
      image: "./assets/products/Elaion_MI1540.webp",
      featured: false,
      badge: null
    },
    {
      id: 3,
      name: "ELAION F30 5W-40",
      category: "elaion",
      technology: "Sintético",
      description: "Lubricante 100% sintético de última generación con tecnología TEC. Máxima protección en todas las condiciones de manejo. Recomendado por las principales marcas automotrices del mundo.",
      specs: "API SP • ACEA C3",
      viscosity: "5W-40",
      presentations: ["1L", "4L", "20L", "208L"],
      applications: ["Automóviles", "SUV", "Camionetas", "Turbos"],
      vehicleType: "auto",
      image: "./assets/products/Elaion_AURO_FR540.webp",
      featured: true,
      badge: "PREMIUM"
    },
    {
      id: 4,
      name: "ELAION F30 5W-30",
      category: "elaion",
      technology: "Sintético",
      description: "Aceite 100% sintético de alta tecnología para motores modernos de eficiencia mejorada. Ahorro de combustible comprobado y máxima protección del motor.",
      specs: "API SP • ACEA C2/C3",
      viscosity: "5W-30",
      presentations: ["1L", "4L", "20L"],
      applications: ["Automóviles", "SUV", "Vehículos europeos"],
      vehicleType: "auto",
      image: "./assets/products/Elaion_AURO_FR530.webp",
      featured: false,
      badge: null
    },
    {
      id: 5,
      name: "ELAION F50 0W-20",
      category: "elaion",
      technology: "Sintético Total",
      description: "El aceite más avanzado de la línea ELAION. Diseñado para motores de alta eficiencia que requieren viscosidades ultra-bajas. Máximo ahorro de combustible y protección extrema para vehículos modernos.",
      specs: "API SP • ILSAC GF-6A",
      viscosity: "0W-20",
      presentations: ["1L", "4L"],
      applications: ["Automóviles modernos", "Híbridos", "Alta eficiencia"],
      vehicleType: "auto",
      image: "./assets/products/Elaion_AURO_FE530.webp",
      featured: true,
      badge: "TECNOLOGÍA TEC"
    },
    {
      id: 6,
      name: "ELAION SUV 5W-40",
      category: "elaion",
      technology: "Sintético",
      description: "Formulado especialmente para SUVs y 4x4. Soporta las exigencias del manejo off-road y en ciudad. Protege el motor en condiciones extremas de temperatura y carga.",
      specs: "API SP • ACEA A3/B4",
      viscosity: "5W-40",
      presentations: ["1L", "4L", "20L"],
      applications: ["SUV", "4x4", "Camionetas", "Off-road"],
      vehicleType: "auto",
      image: "./assets/products/Elaion_AURO_PLUS540.webp",
      featured: false,
      badge: "PARA SUV"
    },
    {
      id: 7,
      name: "EXTRAVIDA DX 15W-40",
      category: "extravida",
      technology: "Mineral",
      description: "Lubricante mineral multiuso para motores diesel de carga pesada. Formulado con aditivos de alta calidad para maximizar la vida útil del motor. Excelente estabilidad térmica y protección anticorrosiva.",
      specs: "API CI-4/SL • ACEA E7",
      viscosity: "15W-40",
      presentations: ["1L", "4L", "20L", "208L"],
      applications: ["Camiones", "Buses", "Maquinaria agrícola", "Generadores"],
      vehicleType: "camion",
      image: "./assets/products/extravida_xv_300.webp",
      featured: true,
      badge: null
    },
    {
      id: 8,
      name: "EXTRAVIDA ULTRA 10W-40",
      category: "extravida",
      technology: "Semi-Sintético",
      description: "Lubricante semi-sintético para motores diesel de alta performance. Mayor durabilidad y resistencia a la oxidación. Intervalos de cambio extendidos para mayor eficiencia operativa en flotas.",
      specs: "API CI-4 Plus • ACEA E7/E9",
      viscosity: "10W-40",
      presentations: ["20L", "208L"],
      applications: ["Camiones pesados", "Flotas", "Maquinaria industrial"],
      vehicleType: "camion",
      image: "./assets/products/extravida_xvt_550_10w_40v.webp",
      featured: false,
      badge: "PLUS"
    },
    {
      id: 9,
      name: "EXTRAVIDA MAXIMO 10W-40",
      category: "extravida",
      technology: "Sintético",
      description: "La cima de la tecnología EXTRAVIDA. Lubricante 100% sintético para los motores diesel más exigentes de última generación. Máxima protección, mínimo desgaste y mayor intervalo entre cambios.",
      specs: "API CK-4 • ACEA E9",
      viscosity: "10W-40",
      presentations: ["20L", "208L"],
      applications: ["Camiones de última generación", "Alta performance diesel", "Euro VI"],
      vehicleType: "camion",
      image: "./assets/products/extravida_xvt_650.webp",
      featured: false,
      badge: "MÁXIMO"
    },
    {
      id: 10,
      name: "YPF RÖD 4T 10W-40",
      category: "moto",
      technology: "Semi-Sintético",
      description: "Lubricante semi-sintético para motores 4 tiempos de motocicletas. La viscosidad 10W-40 lo convierte en el más versátil de la línea RÖD, ideal para uso urbano y de ruta. Certificado JASO MA2 para perfecta compatibilidad con embrague húmedo.",
      specs: "API SL • JASO MA2",
      viscosity: "10W-40",
      presentations: ["1L", "4L"],
      applications: ["Motos 4T", "Scooters", "Naked", "Sport", "Uso urbano"],
      vehicleType: "moto",
      image: "./assets/products/rod-4t-10w40.webp",
      featured: true,
      badge: "MÁS RECOMENDADO"
    },
    {
      id: 11,
      name: "YPF RÖD 4T 20W-50",
      category: "moto",
      technology: "Mineral",
      description: "Lubricante mineral para motocicletas de alta cilindrada o en climas cálidos. La mayor viscosidad 20W-50 brinda protección óptima en condiciones de alta temperatura y uso intensivo. Compatible con embrague húmedo.",
      specs: "API SL • JASO MA2",
      viscosity: "20W-50",
      presentations: ["1L", "4L"],
      applications: ["Motos de alta cilindrada", "Climas cálidos", "Uso intensivo"],
      vehicleType: "moto",
      image: "./assets/products/rod-4t-20w50.webp",
      featured: false,
      badge: null
    },
    {
      id: 12,
      name: "YPF RÖD 4T 10W-30",
      category: "moto",
      technology: "Semi-Sintético",
      description: "Lubricante semi-sintético de menor viscosidad para motos modernas y scooters de baja cilindrada. Fluye con facilidad en arranques en frío y mantiene excelente protección a temperatura de operación.",
      specs: "API SL • JASO MA2",
      viscosity: "10W-30",
      presentations: ["1L", "4L"],
      applications: ["Scooters", "Motos de baja cilindrada", "Motos modernas"],
      vehicleType: "moto",
      image: "./assets/products/rod-4t-10w30.webp",
      featured: false,
      badge: null
    },
    {
      id: 13,
      name: "YPF RÖD 4T 10W-50",
      category: "moto",
      technology: "Sintético",
      description: "Lubricante 100% sintético de máxima performance para motocicletas de alto rendimiento. La formulación sintética 10W-50 ofrece protección superior en uso deportivo, altas RPM y temperatura extrema.",
      specs: "API SN • JASO MA2",
      viscosity: "10W-50",
      presentations: ["1L", "4L"],
      applications: ["Motos deportivas", "Supersport", "Alto rendimiento", "Circuito"],
      vehicleType: "moto",
      image: "./assets/products/rod-4t-10w50.webp",
      featured: false,
      badge: "SINTÉTICO"
    },
    {
      id: 14,
      name: "YPF RÖD 2T",
      category: "moto",
      technology: "Semi-Sintético",
      description: "Lubricante semi-sintético específico para motores 2 tiempos de moto. Formulación de baja emisión de humo y alta lubricidad. Protege el motor y reduce el depósito de carbonilla en válvulas y pistones.",
      specs: "API TC • JASO FC",
      viscosity: "2T",
      presentations: ["1L", "4L"],
      applications: ["Motos 2T", "Karts", "Motosierras", "Equipos de jardín"],
      vehicleType: "moto",
      image: "./assets/products/rod-2t.webp",
      featured: false,
      badge: null
    },
    {
      id: 15,
      name: "YPF RÖD CADENAS",
      category: "moto",
      technology: "Aerosol",
      description: "Lubricante en aerosol para cadenas de motocicletas. Penetra entre los eslabones protegiéndolos de la oxidación y reduciendo el desgaste. Alta adherencia para mantenerse en la cadena incluso en condiciones húmedas.",
      specs: "NLGI 00",
      viscosity: "N/A",
      presentations: ["300ml"],
      applications: ["Cadenas de moto", "Transmisiones", "Cadenas de bicicleta"],
      vehicleType: "moto",
      image: "./assets/products/rod-cadenas.webp",
      featured: false,
      badge: null
    },
    {
      id: 16,
      name: "KRIOX Refrigerante Rojo",
      category: "otros",
      technology: "Pre-diluido",
      description: "Refrigerante pre-diluido listo para usar. Protege el sistema de enfriamiento de la corrosión y el congelamiento. Compatible con todos los metales presentes en el sistema de refrigeración.",
      specs: "ASTM D3306 • BS 6580",
      viscosity: "N/A",
      presentations: ["1L", "4L", "20L"],
      applications: ["Todos los vehículos", "Radiadores de aluminio y cobre"],
      vehicleType: "auto",
      image: "./assets/products/refrigerantes_motores_livianos.webp",
      featured: false,
      badge: null
    },
    {
      id: 17,
      name: "Líquido de Frenos DOT 4",
      category: "otros",
      technology: "Fluido hidráulico",
      description: "Líquido de frenos de alta calidad. Punto de ebullición seco de 230°C. Compatible con todos los sistemas de frenos que utilizan DOT 3 y DOT 4. Protección contra la corrosión interna.",
      specs: "DOT 4 • SAE J1703 • FMVSS 116",
      viscosity: "N/A",
      presentations: ["500ml", "1L"],
      applications: ["Sistemas de frenos hidráulicos", "Embragues hidráulicos"],
      vehicleType: "auto",
      image: "./assets/products/liquidos_frenos.webp",
      featured: false,
      badge: null
    },
    {
      id: 18,
      name: "Grasa EP2 Multipropósito",
      category: "otros",
      technology: "Grasa",
      description: "Grasa multipropósito con aditivos de extrema presión (EP). Ideal para rodamientos, articulaciones y bujes de todo tipo de vehículos y maquinaria. Excelente resistencia al agua.",
      specs: "NLGI #2 • DIN 51502 KP2K",
      viscosity: "N/A",
      presentations: ["400g", "1kg", "18kg"],
      applications: ["Rodamientos", "Bujes", "Articulaciones", "Maquinaria"],
      vehicleType: "camion",
      image: "./assets/products/litio.webp",
      featured: false,
      badge: null
    },
    {
      id: 19,
      name: "Hidráulico AW 68",
      category: "otros",
      technology: "Mineral",
      description: "Aceite hidráulico antidesgaste para sistemas hidráulicos industriales y de maquinaria agrícola. Formulado con inhibidores de oxidación, corrosión y antiespumante de alta eficacia.",
      specs: "ISO VG 68 • DIN 51524-2 HLP",
      viscosity: "ISO 68",
      presentations: ["20L", "208L"],
      applications: ["Maquinaria hidráulica", "Tractores", "Compresores", "Industria"],
      vehicleType: "camion",
      image: "./assets/products/sistemas_hidraulicos.webp",
      featured: false,
      badge: null
    }
  ];

  /* ── Init (async: fetch from Supabase or fall back to DEFAULTS) ── */
  async function init() {
    if (_db) {
      try {
        await _syncFromDB();
        return;
      } catch (_) { /* sin conexión — continuar con local */ }
    }
    if (localStorage.getItem(VERSION_KEY) !== DATA_VERSION || !localStorage.getItem(STORAGE_KEY)) {
      _saveLocal(DEFAULTS);
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
    }
  }

  /* ── Auth helpers (used by admin.js) ───────────────────────────── */
  async function signIn(email, password) {
    if (!_db) return null; // null = use local auth fallback
    const { error } = await _db.auth.signInWithPassword({ email, password });
    return !error;
  }

  async function signOut() {
    if (_db) await _db.auth.signOut();
  }

  async function getSession() {
    if (!_db) return null;
    const { data } = await _db.auth.getSession();
    return data.session;
  }

  /* ── Read ───────────────────────────────────────────────────────── */
  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      _saveLocal(DEFAULTS);
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
      return DEFAULTS.slice();
    }
  }

  function getById(id) {
    return getAll().find(p => p.id === Number(id));
  }

  function _saveLocal(products) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }

  /* ── Write ──────────────────────────────────────────────────────── */
  async function add(product) {
    const products = getAll();
    const nextId   = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newProd  = { ..._normalize(product), id: nextId };

    if (_db) {
      const { data, error } = await _db
        .from('products')
        .insert(_toRow(newProd))
        .select()
        .single();
      if (!error && data) newProd.id = data.id;
      await _syncFromDB();
      return newProd;
    }

    products.push(newProd);
    _saveLocal(products);
    return newProd;
  }

  async function update(id, data) {
    const products = getAll();
    const idx      = products.findIndex(p => p.id === Number(id));
    if (idx === -1) return null;
    const updated  = { ..._normalize({ ...products[idx], ...data }), id: Number(id) };

    if (_db) {
      await _db.from('products').update(_toRow(updated)).eq('id', Number(id));
      await _syncFromDB();
      return updated;
    }

    products[idx] = updated;
    _saveLocal(products);
    return updated;
  }

  async function remove(id) {
    if (_db) {
      await _db.from('products').delete().eq('id', Number(id));
      await _syncFromDB();
      return;
    }
    _saveLocal(getAll().filter(p => p.id !== Number(id)));
  }

  async function reset() {
    if (_db) {
      await _db.from('products').delete().neq('id', 0);
      await _db.from('products').insert(DEFAULTS.map(_toRow));
      await _syncFromDB();
      return;
    }
    _saveLocal(DEFAULTS);
  }

  const CATEGORIES = {
    all:       { label: 'Todos los Productos', color: '#003087' },
    elaion:    { label: 'ELAION',              color: '#003087' },
    extravida: { label: 'EXTRAVIDA',           color: '#001B4D' },
    moto:      { label: 'RÖD',                 color: '#1565C0' },
    otros:     { label: 'Otros Productos',     color: '#37474F' }
  };

  return { init, getAll, getById, add, update, remove, reset, signIn, signOut, getSession, DEFAULTS, CATEGORIES };
})();
