'use strict';

// Cliente Supabase compartido entre módulos del admin.
// Los módulos lo consumen via `window.adminDb`.
(function initSharedSupabase() {
  const url  = window.SUPABASE_URL  || '';
  const anon = window.SUPABASE_ANON || '';
  if (url && anon && typeof window.supabase !== 'undefined') {
    window.adminDb = window.supabase.createClient(url, anon);
  } else {
    window.adminDb = null;
  }
})();

const ADMIN_CREDS_KEY  = 'cgs_admin_creds';
const ADMIN_SESSION    = 'cgs_admin_session';
const CGS_CONFIG_KEY   = 'cgs_config';
const DEFAULT_WA_CFG   = { waNumber: '595994443113', waMessage: 'Hola CGS, quisiera consultar sobre sus productos YPF.' };

const DEFAULT_CREDS = { username: 'admin', password: 'cgs2024' };

/* ─── Init ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await CGS.init();
  initAdminCreds();

  // If Supabase is configured, check for an active session
  const session = await CGS.getSession();
  if (session || isLoggedIn()) {
    if (session) sessionStorage.setItem(ADMIN_SESSION, 'true');
    showDashboard();
  } else {
    showLogin();
  }

  setupLoginForm();
  setupProductForm();
  setupSearch();
  setupLogout();
  setupChangePassword();
  setupWhatsAppConfig();
});

/* ─── Auth ───────────────────────────────────────── */
function initAdminCreds() {
  if (!localStorage.getItem(ADMIN_CREDS_KEY)) {
    localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(DEFAULT_CREDS));
  }
}

function isLoggedIn() {
  return sessionStorage.getItem(ADMIN_SESSION) === 'true';
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  renderStats();
  renderProductTable();
}

function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const errEl    = document.getElementById('login-error');

    // Try Supabase auth first (when configured)
    const supaResult = await CGS.signIn(username, password);
    if (supaResult === true) {
      sessionStorage.setItem(ADMIN_SESSION, 'true');
      errEl.textContent = '';
      await CGS.init();
      showDashboard();
      return;
    }
    if (supaResult === false) {
      // Supabase is configured but credentials are wrong
      errEl.textContent = 'Usuario o contraseña incorrectos.';
      document.getElementById('login-pass').value = '';
      return;
    }

    // supaResult === null: Supabase not configured — use local credentials
    const creds = JSON.parse(localStorage.getItem(ADMIN_CREDS_KEY) || '{}');
    if (username === creds.username && password === creds.password) {
      sessionStorage.setItem(ADMIN_SESSION, 'true');
      errEl.textContent = '';
      showDashboard();
    } else {
      errEl.textContent = 'Usuario o contraseña incorrectos.';
      document.getElementById('login-pass').value = '';
    }
  });
}

function setupLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await CGS.signOut();
    sessionStorage.removeItem(ADMIN_SESSION);
    showLogin();
  });
}

/* ─── Stats ──────────────────────────────────────── */
function renderStats() {
  const products = CGS.getAll();
  const byCategory = {};
  products.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  });

  setText('stat-total',     products.length);
  setText('stat-elaion',    byCategory.elaion    || 0);
  setText('stat-extravida', byCategory.extravida || 0);
  setText('stat-moto',      byCategory.moto      || 0);
  setText('stat-otros',     byCategory.otros     || 0);
  setText('stat-featured',  products.filter(p => p.featured).length);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ─── Product table ──────────────────────────────── */
let tableSearch = '';

function setupSearch() {
  const input = document.getElementById('table-search');
  if (!input) return;
  input.addEventListener('input', () => {
    tableSearch = input.value.trim().toLowerCase();
    renderProductTable();
  });
}

function renderProductTable() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  let products = CGS.getAll();
  if (tableSearch) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(tableSearch) ||
      p.category.toLowerCase().includes(tableSearch)
    );
  }

  const countEl = document.getElementById('table-count');
  if (countEl) countEl.textContent = `${products.length} producto${products.length !== 1 ? 's' : ''}`;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No se encontraron productos.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const catLabel = CGS.CATEGORIES[p.category]?.label || p.category;
    const pres = Array.isArray(p.presentations) ? p.presentations.join(', ') : '-';
    return `
      <tr>
        <td class="td-name">
          <div class="td-name-inner">
            <div class="td-color" style="background:${catColor(p.category)}"></div>
            <span>${p.name}</span>
          </div>
        </td>
        <td><span class="cat-pill" style="background:${catColor(p.category)}">${catLabel}</span></td>
        <td>${p.technology}</td>
        <td>${p.viscosity}</td>
        <td class="td-pres">${pres}</td>
        <td>
          <div class="td-actions">
            <button class="action-btn edit-btn" onclick="openEditModal(${p.id})" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="action-btn delete-btn" onclick="confirmDelete(${p.id}, '${p.name.replace(/'/g, "\\'")}')" title="Eliminar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function catColor(cat) {
  const m = { elaion:'#003087', extravida:'#001B4D', moto:'#1565C0', otros:'#37474F' };
  return m[cat] || '#555';
}

/* ─── Product form modal ─────────────────────────── */
function setupProductForm() {
  document.getElementById('add-product-btn')?.addEventListener('click', () => openAddModal());
  document.getElementById('modal-backdrop')?.addEventListener('click', closeProductModal);
  document.getElementById('cancel-btn')?.addEventListener('click', closeProductModal);
  document.getElementById('product-form')?.addEventListener('submit', handleFormSubmit);
  document.getElementById('image-url-input')?.addEventListener('input', previewImage);
}

function openAddModal() {
  resetForm();
  document.getElementById('modal-title').textContent = 'Nuevo Producto';
  document.getElementById('form-id').value = '';
  document.getElementById('form-modal').classList.remove('hidden');
}

function openEditModal(id) {
  const p = CGS.getById(id);
  if (!p) return;
  resetForm();
  document.getElementById('modal-title').textContent  = 'Editar Producto';
  document.getElementById('form-id').value             = p.id;
  document.getElementById('form-name').value           = p.name;
  document.getElementById('form-category').value       = p.category;
  document.getElementById('form-technology').value     = p.technology;
  document.getElementById('form-viscosity').value      = p.viscosity;
  document.getElementById('form-specs').value          = p.specs;
  document.getElementById('form-description').value    = p.description;
  document.getElementById('form-vehicle').value        = p.vehicleType || 'auto';
  document.getElementById('form-presentations').value  = Array.isArray(p.presentations) ? p.presentations.join(', ') : '';
  document.getElementById('form-applications').value   = Array.isArray(p.applications)  ? p.applications.join(', ')  : '';
  document.getElementById('image-url-input').value     = p.image || '';
  document.getElementById('form-badge').value          = p.badge || '';
  document.getElementById('form-featured').checked     = !!p.featured;
  if (p.image) previewImage();
  document.getElementById('form-modal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('form-modal').classList.add('hidden');
}

function resetForm() {
  document.getElementById('product-form').reset();
  document.getElementById('image-preview').innerHTML = '';
  document.getElementById('form-error').textContent  = '';
}

function previewImage() {
  const url = document.getElementById('image-url-input').value.trim();
  const preview = document.getElementById('image-preview');
  if (!url) { preview.innerHTML = ''; return; }
  preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<span class=preview-error>URL de imagen no válida</span>'" style="max-height:120px;border-radius:8px;margin-top:8px;">`;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const errEl   = document.getElementById('form-error');
  const saveBtn = document.querySelector('.form-modal-footer .btn-save');
  const name    = document.getElementById('form-name').value.trim();
  if (!name) { errEl.textContent = 'El nombre es obligatorio.'; return; }
  errEl.textContent = '';
  if (saveBtn) saveBtn.disabled = true;

  const data = {
    name:          name,
    category:      document.getElementById('form-category').value,
    technology:    document.getElementById('form-technology').value.trim(),
    viscosity:     document.getElementById('form-viscosity').value.trim() || 'N/A',
    specs:         document.getElementById('form-specs').value.trim(),
    description:   document.getElementById('form-description').value.trim(),
    vehicleType:   document.getElementById('form-vehicle').value,
    presentations: document.getElementById('form-presentations').value.trim(),
    applications:  document.getElementById('form-applications').value.trim(),
    image:         document.getElementById('image-url-input').value.trim(),
    badge:         document.getElementById('form-badge').value.trim() || null,
    featured:      document.getElementById('form-featured').checked
  };

  const id = document.getElementById('form-id').value;
  if (id) {
    await CGS.update(id, data);
    showToast('Producto actualizado correctamente.');
  } else {
    await CGS.add(data);
    showToast('Producto agregado correctamente.');
  }

  if (saveBtn) saveBtn.disabled = false;
  closeProductModal();
  renderStats();
  renderProductTable();
}

/* ─── Delete ─────────────────────────────────────── */
function confirmDelete(id, name) {
  const dlg = document.getElementById('confirm-modal');
  const msg = document.getElementById('confirm-msg');
  if (!dlg || !msg) return;
  msg.textContent = `¿Eliminar el producto "${name}"? Esta acción no se puede deshacer.`;
  dlg.classList.remove('hidden');

  document.getElementById('confirm-yes').onclick = async () => {
    await CGS.remove(id);
    dlg.classList.add('hidden');
    renderStats();
    renderProductTable();
    showToast('Producto eliminado.');
  };
  document.getElementById('confirm-no').onclick = () => {
    dlg.classList.add('hidden');
  };
}

/* ─── Reset defaults ─────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reset-btn')?.addEventListener('click', async () => {
    if (confirm('¿Restaurar todos los productos a los valores predeterminados? Se perderán los cambios.')) {
      await CGS.reset();
      renderStats();
      renderProductTable();
      showToast('Catálogo restaurado a los valores predeterminados.');
    }
  });
});

/* ─── Change password ────────────────────────────── */
function setupChangePassword() {
  document.getElementById('change-pass-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const curr = document.getElementById('cp-current').value;
    const next = document.getElementById('cp-new').value;
    const conf = document.getElementById('cp-confirm').value;
    const creds = JSON.parse(localStorage.getItem(ADMIN_CREDS_KEY) || '{}');
    const errEl = document.getElementById('cp-error');

    if (curr !== creds.password) { errEl.textContent = 'Contraseña actual incorrecta.'; return; }
    if (next.length < 6)         { errEl.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.'; return; }
    if (next !== conf)           { errEl.textContent = 'Las contraseñas no coinciden.'; return; }

    creds.password = next;
    localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(creds));
    errEl.textContent = '';
    document.getElementById('change-pass-form').reset();
    showToast('Contraseña actualizada correctamente.');
  });
}

/* ─── WhatsApp config ────────────────────────────── */
function setupWhatsAppConfig() {
  const form = document.getElementById('wa-config-form');
  if (!form) return;

  // Load current values
  const cfg = Object.assign({}, DEFAULT_WA_CFG, JSON.parse(localStorage.getItem(CGS_CONFIG_KEY) || '{}'));
  document.getElementById('wa-number').value  = cfg.waNumber;
  document.getElementById('wa-message').value = cfg.waMessage;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const number  = document.getElementById('wa-number').value.trim().replace(/\D/g, '');
    const message = document.getElementById('wa-message').value.trim();
    const errEl   = document.getElementById('wa-config-error');

    if (number.length < 10) { errEl.textContent = 'El número debe tener al menos 10 dígitos.'; return; }
    errEl.textContent = '';

    localStorage.setItem(CGS_CONFIG_KEY, JSON.stringify({ waNumber: number, waMessage: message || DEFAULT_WA_CFG.waMessage }));
    document.getElementById('wa-number').value = number;
    showToast('Configuración de WhatsApp guardada.');
  });
}

/* ─── Tab switching (con lazy-init de cada módulo) ─── */
const TAB_TITLES = {
  'tab-products':   'Gestión de Productos',
  'tab-vehiculos':  'Guía de Vehículos',
  'tab-vendedores': 'Vendedores',
  'tab-clientes':   'Clientes',
  'tab-pedidos':    'Pedidos',
  'tab-settings':   'Configuración'
};

const _initializedTabs = new Set(['tab-products']);  // products ya inicializa solo

function switchTab(tabId) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
  document.querySelector(`.sidebar-link[data-tab="${tabId}"]`)?.classList.add('active');
  document.getElementById(tabId)?.classList.remove('hidden');

  // Actualizar título topbar y botones contextuales
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = TAB_TITLES[tabId] || '';
  updateTopbarActions(tabId);

  // Lazy init la primera vez que se entra
  if (!_initializedTabs.has(tabId)) {
    _initializedTabs.add(tabId);
    if (tabId === 'tab-vehiculos'  && window.AdminVehiculos)  window.AdminVehiculos.init();
    if (tabId === 'tab-vendedores' && window.AdminVendedores) window.AdminVendedores.init();
    if (tabId === 'tab-clientes'   && window.AdminClientes)   window.AdminClientes.init();
    if (tabId === 'tab-pedidos'    && window.AdminPedidos)    window.AdminPedidos.init();
  } else {
    // Refrescar al volver
    if (tabId === 'tab-vehiculos'  && window.AdminVehiculos)  window.AdminVehiculos.refresh?.();
    if (tabId === 'tab-vendedores' && window.AdminVendedores) window.AdminVendedores.refresh?.();
    if (tabId === 'tab-clientes'   && window.AdminClientes)   window.AdminClientes.refresh?.();
    if (tabId === 'tab-pedidos'    && window.AdminPedidos)    window.AdminPedidos.refresh?.();
  }
}

function updateTopbarActions(tabId) {
  const actions = document.querySelector('.topbar-actions');
  if (!actions) return;
  // Mostrar/ocultar botón nuevo según tab
  const buttonsByTab = {
    'tab-products':   { text: 'Nuevo Producto',  id: 'add-product-btn',   handler: null },
    'tab-vehiculos':  { text: 'Nuevo vehículo',  id: 'add-vehiculo-btn',  handler: () => window.AdminVehiculos?.openAdd() },
    'tab-vendedores': { text: 'Nuevo vendedor',  id: 'add-vendedor-btn',  handler: () => window.AdminVendedores?.openAdd() },
    'tab-clientes':   { text: 'Nuevo cliente',   id: 'add-cliente-btn',   handler: () => window.AdminClientes?.openAdd() }
  };
  actions.querySelectorAll('.btn-add-dynamic').forEach(el => el.remove());

  const cfg = buttonsByTab[tabId];
  // Mostrar el botón original "Nuevo Producto" solo en tab-products
  const origBtn = document.getElementById('add-product-btn');
  if (origBtn) origBtn.style.display = (tabId === 'tab-products') ? '' : 'none';
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.style.display = (tabId === 'tab-products') ? '' : 'none';

  if (cfg && cfg.handler) {
    const btn = document.createElement('button');
    btn.className = 'btn-add btn-add-dynamic';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> ${cfg.text}`;
    btn.addEventListener('click', cfg.handler);
    actions.appendChild(btn);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      if (link.dataset.tab) switchTab(link.dataset.tab);
    });
  });

  // Cierre genérico de modales por data-close
  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-close');
      document.getElementById(id)?.classList.add('hidden');
    });
  });
});

// Helper global para mostrar toasts desde otros módulos
window.cgsToast = showToast;

/* ─── Toast notifications ────────────────────────── */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
