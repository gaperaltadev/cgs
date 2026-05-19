'use strict';

/* ─── State ─────────────────────────────────────── */
let activeCategory = 'all';
let searchQuery    = '';
let currentProduct = null;

/* ─── Init ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  CGS.init();
  setupHeader();
  setupMobileMenu();
  setupCategoryTabs();
  setupSearch();
  setupLubricationGuide();
  renderProducts();
  setupModal();
  setupScrollReveal();
  setupWhatsAppFloat();
  animateCounters();
  updateWaLinks();
});

/* ─── Header ─────────────────────────────────────── */
function setupHeader() {
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  });

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const mobileNav = document.getElementById('mobile-nav');
      if (mobileNav) mobileNav.classList.remove('open');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ─── Mobile menu ────────────────────────────────── */
function setupMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const nav = document.getElementById('mobile-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    nav.classList.toggle('open');
  });
}

/* ─── Category tabs ──────────────────────────────── */
function setupCategoryTabs() {
  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.cat;
      renderProducts();
    });
  });
}

/* ─── Search ─────────────────────────────────────── */
function setupSearch() {
  const input = document.getElementById('catalog-search');
  if (!input) return;
  input.addEventListener('input', () => {
    searchQuery = input.value.trim().toLowerCase();
    renderProducts();
  });
}

/* ─── Product rendering ──────────────────────────── */
function getFilteredProducts() {
  let products = CGS.getAll();
  if (activeCategory !== 'all') {
    products = products.filter(p => p.category === activeCategory);
  }
  if (searchQuery) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery) ||
      p.technology.toLowerCase().includes(searchQuery) ||
      p.specs.toLowerCase().includes(searchQuery)
    );
  }
  return products;
}

function getCategoryColor(cat) {
  const colors = {
    elaion:    '#003087',
    extravida: '#001B4D',
    moto:      '#1565C0',
    otros:     '#37474F'
  };
  return colors[cat] || '#003087';
}

function getCategoryAccent(cat) {
  return 'rgba(255,255,255,0.9)';
}

function productCardHTML(p) {
  const bg    = getCategoryColor(p.category);
  const acc   = getCategoryAccent(p.category);
  const label = CGS.CATEGORIES[p.category]?.label || p.category;
  const pres  = Array.isArray(p.presentations) ? p.presentations : [];
  const badge = p.badge ? `<span class="card-badge">${p.badge}</span>` : '';
  const imgHTML = p.image
    ? `<img src="${p.image}" alt="${p.name}" class="card-img" loading="lazy">`
    : `<div class="card-placeholder" style="background:linear-gradient(135deg,${bg} 0%,${bg}CC 100%)">
         <div class="placeholder-text" style="color:${acc}">${label}</div>
         <div class="placeholder-viscosity">${p.viscosity !== 'N/A' ? p.viscosity : p.technology}</div>
       </div>`;

  const presHTML = pres.slice(0, 4).map(pr =>
    `<span class="pres-tag">${pr}</span>`
  ).join('');

  return `
    <div class="product-card" data-id="${p.id}" data-category="${p.category}">
      <div class="card-image-wrap">
        ${badge}
        ${imgHTML}
        <div class="card-category-pill" style="background:${bg}">${label}</div>
      </div>
      <div class="card-body">
        <h3 class="card-name">${p.name}</h3>
        <p class="card-tech">${p.technology}</p>
        <p class="card-desc">${p.description.substring(0, 100)}…</p>
        <div class="card-specs">${p.specs}</div>
        ${pres.length ? `<div class="card-pres"><span>Presentaciones:</span><div class="pres-tags">${presHTML}</div></div>` : ''}
      </div>
      <div class="card-footer">
        <button class="btn-detail" onclick="openModal(${p.id})">Ver Detalle</button>
        <a class="btn-consult" href="#" data-wa="product" data-product="${p.name.replace(/"/g, '&quot;')}" target="_blank">Consultar</a>
      </div>
    </div>`;
}

function renderProducts() {
  const grid    = document.getElementById('products-grid');
  const noRes   = document.getElementById('no-results');
  const counter = document.getElementById('product-count');
  if (!grid) return;

  const filtered = getFilteredProducts();
  if (counter) counter.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noRes) noRes.classList.remove('hidden');
  } else {
    if (noRes) noRes.classList.add('hidden');
    grid.innerHTML = filtered.map(productCardHTML).join('');
    requestAnimationFrame(() => {
      grid.querySelectorAll('.product-card').forEach((card, i) => {
        card.style.animationDelay = `${i * 50}ms`;
        card.classList.add('card-enter');
      });
      updateWaLinks();
    });
  }
}

/* ─── Modal ──────────────────────────────────────── */
function setupModal() {
  const overlay = document.getElementById('product-modal');
  if (!overlay) return;
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
}

function openModal(id) {
  const p = CGS.getById(id);
  if (!p) return;
  currentProduct = p;
  const content = document.getElementById('modal-content');
  const overlay = document.getElementById('product-modal');
  if (!content || !overlay) return;

  const bg  = getCategoryColor(p.category);
  const acc = getCategoryAccent(p.category);
  const label = CGS.CATEGORIES[p.category]?.label || p.category;
  const pres  = Array.isArray(p.presentations) ? p.presentations : [];
  const apps  = Array.isArray(p.applications)  ? p.applications  : [];

  const imgBg = `linear-gradient(160deg, ${bg}18 0%, ${bg}08 100%)`;
  const imgSection = p.image
    ? `<img src="${p.image}" alt="${p.name}" class="modal-img" style="background:${imgBg}">`
    : `<div class="modal-placeholder" style="background:linear-gradient(135deg,${bg} 0%,${bg}99 100%)">
         <div class="modal-placeholder-text" style="color:${acc}">${label}</div>
         <div class="modal-placeholder-visc">${p.viscosity !== 'N/A' ? p.viscosity : p.technology}</div>
       </div>`;

  content.innerHTML = `
    <div class="modal-image-wrap">${imgSection}</div>
    <div class="modal-info">
      <div class="modal-header-meta">
        <div class="modal-category" style="background:${bg}">${label}</div>
        ${p.badge ? `<span class="modal-badge">${p.badge}</span>` : ''}
      </div>
      <h2 class="modal-title">${p.name}</h2>
      <p class="modal-tech">${p.technology} • SAE ${p.viscosity}</p>
      <p class="modal-desc">${p.description}</p>
      <div class="modal-specs">
        <strong>Especificaciones:</strong>
        <span>${p.specs}</span>
      </div>
      ${apps.length ? `
      <div class="modal-section">
        <strong>Aplicaciones:</strong>
        <div class="modal-tags">${apps.map(a => `<span class="modal-tag">${a}</span>`).join('')}</div>
      </div>` : ''}
      ${pres.length ? `
      <div class="modal-section">
        <strong>Presentaciones disponibles:</strong>
        <div class="modal-tags">${pres.map(pr => `<span class="modal-tag pres">${pr}</span>`).join('')}</div>
      </div>` : ''}
      <div class="modal-actions">
        <a href="#" data-wa="product" data-product="${p.name} (${p.specs})"
           class="btn btn-whatsapp-large" target="_blank">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Consultar por WhatsApp
        </a>
        <a href="tel:+59521673395" class="btn btn-outline-dark">Llamar ahora</a>
      </div>
    </div>`;

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  updateWaLinks();
}

function closeModal() {
  const overlay = document.getElementById('product-modal');
  if (overlay) overlay.classList.add('hidden');
  document.body.style.overflow = '';
  currentProduct = null;
}

/* ─── Lubrication Guide ──────────────────────────── */
function setupLubricationGuide() {
  const btns = document.querySelectorAll('.vehicle-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGuide(btn.dataset.type);
    });
  });
  renderGuide('auto');
}

const GUIDE_DATA = {
  auto: {
    title: 'Autos y Camionetas',
    usages: [
      {
        label: 'Ciudad / Uso normal',
        desc:  'Manejo diario en ciudad, stop & go, trayectos cortos.',
        rec:   [1, 2],
        tip:   'Para ciudad recomendamos SAE 5W-30 o 10W-40 semi-sintético.'
      },
      {
        label: 'Ruta / Alta performance',
        desc:  'Viajes largos, altas velocidades, motores modernos.',
        rec:   [3, 4],
        tip:   'El sintético 5W-40 ofrece máxima protección en ruta.'
      },
      {
        label: 'SUV / 4x4',
        desc:  'Vehículos de mayor porte, tracción 4x4, off-road.',
        rec:   [6, 3],
        tip:   'El ELAION SUV está formulado especialmente para este uso.'
      },
      {
        label: 'Motores modernos de alta eficiencia',
        desc:  'Vehículos 2020+, turbo de baja cilindrada.',
        rec:   [5, 4],
        tip:   'Viscosidades 0W-20 o 5W-30 para máximo ahorro de combustible.'
      }
    ]
  },
  moto: {
    title: 'Motos y Scooters',
    usages: [
      {
        label: 'Uso diario / Urbano',
        desc:  'Traslados diarios, scooters y motos de baja cilindrada.',
        rec:   [10],
        tip:   'El 10W-40 es el más versátil para uso urbano.'
      },
      {
        label: 'Alta cilindrada / Climas cálidos',
        desc:  'Motos +400cc o temperaturas sobre 30°C.',
        rec:   [11],
        tip:   'El 20W-50 protege mejor en alta temperatura y cilindrada.'
      },
      {
        label: 'Deportivo / Alto rendimiento',
        desc:  'Motos sport, naked, adventure. Uso intensivo.',
        rec:   [12],
        tip:   'El sintético 5W-40 brinda máxima protección en uso exigente.'
      }
    ]
  },
  camion: {
    title: 'Camiones y Vehículos Pesados',
    usages: [
      {
        label: 'Transporte regional / Corta distancia',
        desc:  'Camiones medianos, distribución local, buses.',
        rec:   [7],
        tip:   'El EXTRAVIDA DX 15W-40 es confiable y de excelente relación costo-beneficio.'
      },
      {
        label: 'Larga distancia / Flotas',
        desc:  'Camiones de ruta, flotas de transporte, intervalos extendidos.',
        rec:   [8],
        tip:   'El semi-sintético ULTRA optimiza los intervalos de cambio.'
      },
      {
        label: 'Motores Euro V / Euro VI / Última generación',
        desc:  'Camiones nuevos con motores de última generación.',
        rec:   [9],
        tip:   'El EXTRAVIDA MAXIMO cumple CK-4, la categoría más exigente del mercado.'
      }
    ]
  }
};

function renderGuide(type) {
  const container = document.getElementById('guide-content');
  if (!container) return;
  const data = GUIDE_DATA[type];
  if (!data) return;

  container.innerHTML = `
    <div class="guide-options">
      ${data.usages.map((u, i) => `
        <button class="guide-option ${i === 0 ? 'active' : ''}" data-idx="${i}" data-type="${type}">
          <span class="opt-label">${u.label}</span>
          <span class="opt-desc">${u.desc}</span>
        </button>
      `).join('')}
    </div>
    <div class="guide-result" id="guide-result">
      ${renderGuideResult(data.usages[0])}
    </div>`;

  container.querySelectorAll('.guide-option').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.guide-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const usage = GUIDE_DATA[btn.dataset.type].usages[Number(btn.dataset.idx)];
      document.getElementById('guide-result').innerHTML = renderGuideResult(usage);
    });
  });
}

function renderGuideResult(usage) {
  const products = usage.rec
    .map(id => CGS.getById(id))
    .filter(Boolean);

  const cards = products.map(p => {
    const bg  = getCategoryColor(p.category);
    const acc = getCategoryAccent(p.category);
    const label = CGS.CATEGORIES[p.category]?.label || p.category;
    const guideImgHTML = p.image
      ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:contain;padding:6px;">`
      : `<span style="color:${acc};font-size:.65rem;font-weight:800;text-align:center;line-height:1.2;">${label}</span>
         <small style="color:${acc};opacity:.8;font-size:.6rem;">${p.viscosity !== 'N/A' ? p.viscosity : ''}</small>`;
    const guideBg = p.image ? 'background:var(--gray-50)' : `background:linear-gradient(135deg,${bg} 0%,${bg}99 100%)`;
    return `
      <div class="guide-product-card">
        <div class="guide-product-img" style="${guideBg}">
          ${guideImgHTML}
        </div>
        <div class="guide-product-info">
          <strong>${p.name}</strong>
          <span>${p.technology}</span>
          <span class="guide-specs">${p.specs}</span>
        </div>
        <button class="guide-ver-btn" onclick="openModal(${p.id})">Ver Producto</button>
      </div>`;
  }).join('');

  return `
    <div class="guide-tip">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      ${usage.tip}
    </div>
    <div class="guide-products">${cards}</div>`;
}

/* ─── Scroll reveal ───────────────────────────────── */
function setupScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ─── Animated counters ───────────────────────────── */
function animateCounters() {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el  = e.target;
      const end = parseInt(el.dataset.target);
      const suffix = el.dataset.suffix || '';
      let current = 0;
      const step = Math.ceil(end / 50);
      const timer = setInterval(() => {
        current = Math.min(current + step, end);
        el.textContent = current + suffix;
        if (current >= end) clearInterval(timer);
      }, 30);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

/* ─── WhatsApp config ─────────────────────────────── */
const CGS_CONFIG_KEY = 'cgs_config';
const DEFAULT_WA = { waNumber: '595994443113', waMessage: 'Hola CGS, quisiera consultar sobre sus productos YPF.' };

function getWaConfig() {
  try {
    return Object.assign({}, DEFAULT_WA, JSON.parse(localStorage.getItem(CGS_CONFIG_KEY) || '{}'));
  } catch { return DEFAULT_WA; }
}

function buildWaUrl(message) {
  const cfg = getWaConfig();
  return `https://wa.me/${cfg.waNumber}?text=${encodeURIComponent(message || cfg.waMessage)}`;
}

function updateWaLinks() {
  const cfg = getWaConfig();
  const floatBtn = document.getElementById('wa-float');
  if (floatBtn) floatBtn.href = buildWaUrl(cfg.waMessage);

  document.querySelectorAll('a[data-wa]').forEach(a => {
    const msg = a.dataset.wa === 'product'
      ? `Hola CGS, quiero consultar sobre: ${a.dataset.product || ''}`
      : cfg.waMessage;
    a.href = buildWaUrl(msg);
  });
}

/* ─── WhatsApp float ──────────────────────────────── */
function setupWhatsAppFloat() {
  const btn = document.getElementById('wa-float');
  if (!btn) return;
  updateWaLinks();
  setTimeout(() => btn.classList.add('visible'), 800);
}
