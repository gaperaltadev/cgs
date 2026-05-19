'use strict';

const ADMIN_CREDS_KEY  = 'cgs_admin_creds';
const ADMIN_SESSION    = 'cgs_admin_session';
const CGS_CONFIG_KEY   = 'cgs_config';
const DEFAULT_WA_CFG   = { waNumber: '595994443113', waMessage: 'Hola CGS, quisiera consultar sobre sus productos YPF.' };

const DEFAULT_CREDS = { username: 'admin', password: 'cgs2024' };

/* ─── Init ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  CGS.init();
  initAdminCreds();

  if (isLoggedIn()) {
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
  form.addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const creds    = JSON.parse(localStorage.getItem(ADMIN_CREDS_KEY) || '{}');
    const errEl    = document.getElementById('login-error');

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
  btn.addEventListener('click', () => {
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

function handleFormSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('form-error');
  const name  = document.getElementById('form-name').value.trim();
  if (!name) { errEl.textContent = 'El nombre es obligatorio.'; return; }
  errEl.textContent = '';

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
    CGS.update(id, data);
    showToast('Producto actualizado correctamente.');
  } else {
    CGS.add(data);
    showToast('Producto agregado correctamente.');
  }

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

  document.getElementById('confirm-yes').onclick = () => {
    CGS.remove(id);
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
  document.getElementById('reset-btn')?.addEventListener('click', () => {
    if (confirm('¿Restaurar todos los productos a los valores predeterminados? Se perderán los cambios.')) {
      CGS.reset();
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

/* ─── Tab switching ──────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
      link.classList.add('active');
      const pane = document.getElementById(link.dataset.tab);
      if (pane) pane.classList.remove('hidden');
    });
  });
});

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
