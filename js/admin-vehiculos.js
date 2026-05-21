'use strict';

// Gestión de la guía de lubricación por vehículo.
// Tabla `vehicle_guide` en Supabase.

(function () {
  const db = window.adminDb;
  let _rows = [];        // todos los vehículos cargados
  let _products = [];    // lista para los selects de recomendado/alternativa
  let _search = '';

  // ─── Init / refresh ─────────────────────────────────────────────────────
  async function init() {
    if (!db) return console.warn('[vehiculos] Supabase no configurado');
    bindUI();
    await loadProducts();
    await refresh();
  }

  async function refresh() {
    const { data, error } = await db
      .from('vehicle_guide')
      .select('id, brand, model, year_from, year_to, engine_type, recommended_product_id, alternative_product_id, notes')
      .order('brand', { ascending: true })
      .order('model', { ascending: true });
    if (error) { console.error('[vehiculos]', error); return; }
    _rows = data || [];
    render();
  }

  async function loadProducts() {
    const { data, error } = await db
      .from('products')
      .select('id, name, category')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) { console.error('[vehiculos] products', error); return; }
    _products = data || [];
    populateProductSelects();
  }

  function populateProductSelects() {
    const opts = ['<option value="">— sin alternativa —</option>']
      .concat(_products.map(p => `<option value="${p.id}">[${p.id}] ${p.name}</option>`));
    document.getElementById('vehiculo-recommended').innerHTML =
      _products.map(p => `<option value="${p.id}">[${p.id}] ${p.name}</option>`).join('');
    document.getElementById('vehiculo-alternative').innerHTML = opts.join('');
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  function render() {
    const tbody = document.getElementById('vehiculos-tbody');
    if (!tbody) return;

    const term = _search.toLowerCase();
    const filtered = term
      ? _rows.filter(r =>
          r.brand.toLowerCase().includes(term) ||
          r.model.toLowerCase().includes(term) ||
          (r.engine_type || '').toLowerCase().includes(term)
        )
      : _rows;

    const countEl = document.getElementById('vehiculos-count');
    if (countEl) countEl.textContent = `${filtered.length} vehículo${filtered.length !== 1 ? 's' : ''}`;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No hay vehículos cargados.</td></tr>`;
      return;
    }

    const prodMap = new Map(_products.map(p => [p.id, p.name]));

    tbody.innerHTML = filtered.map(r => {
      const rango = (r.year_from && r.year_to) ? `${r.year_from}–${r.year_to}`
                  : r.year_from ? `${r.year_from}+`
                  : r.year_to   ? `hasta ${r.year_to}`
                  : '—';
      const motor = r.engine_type
        ? `<span class="cat-pill" style="background:#37474F">${r.engine_type}</span>`
        : '<span class="muted">—</span>';
      const reco = prodMap.get(r.recommended_product_id)
        ? `[${r.recommended_product_id}] ${prodMap.get(r.recommended_product_id)}`
        : `[${r.recommended_product_id}] <span class="muted">(borrado)</span>`;
      const alt = r.alternative_product_id
        ? (prodMap.get(r.alternative_product_id)
            ? `[${r.alternative_product_id}] ${prodMap.get(r.alternative_product_id)}`
            : `[${r.alternative_product_id}] <span class="muted">(borrado)</span>`)
        : '<span class="muted">—</span>';

      return `
        <tr>
          <td class="td-name"><div class="td-name-inner"><span>${escapeHtml(r.brand)} <strong>${escapeHtml(r.model)}</strong></span></div></td>
          <td>${rango}</td>
          <td>${motor}</td>
          <td>${reco}</td>
          <td>${alt}</td>
          <td>
            <div class="td-actions">
              <button class="action-btn edit-btn" data-edit="${r.id}" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="action-btn delete-btn" data-delete="${r.id}" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-edit]').forEach(btn =>
      btn.addEventListener('click', () => openEdit(parseInt(btn.dataset.edit))));
    tbody.querySelectorAll('[data-delete]').forEach(btn =>
      btn.addEventListener('click', () => confirmDelete(parseInt(btn.dataset.delete))));
  }

  // ─── Modal handlers ─────────────────────────────────────────────────────
  function openAdd() {
    document.getElementById('vehiculo-modal-title').textContent = 'Nuevo vehículo';
    document.getElementById('vehiculo-form').reset();
    document.getElementById('vehiculo-form-id').value = '';
    document.getElementById('vehiculo-form-error').textContent = '';
    document.getElementById('vehiculo-modal').classList.remove('hidden');
  }

  function openEdit(id) {
    const r = _rows.find(x => x.id === id);
    if (!r) return;
    document.getElementById('vehiculo-modal-title').textContent = `Editar: ${r.brand} ${r.model}`;
    document.getElementById('vehiculo-form-id').value = r.id;
    document.getElementById('vehiculo-brand').value = r.brand;
    document.getElementById('vehiculo-model').value = r.model;
    document.getElementById('vehiculo-year-from').value = r.year_from ?? '';
    document.getElementById('vehiculo-year-to').value = r.year_to ?? '';
    document.getElementById('vehiculo-engine').value = r.engine_type ?? '';
    document.getElementById('vehiculo-recommended').value = r.recommended_product_id ?? '';
    document.getElementById('vehiculo-alternative').value = r.alternative_product_id ?? '';
    document.getElementById('vehiculo-notes').value = r.notes ?? '';
    document.getElementById('vehiculo-form-error').textContent = '';
    document.getElementById('vehiculo-modal').classList.remove('hidden');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errEl = document.getElementById('vehiculo-form-error');
    errEl.textContent = '';

    const payload = {
      brand: document.getElementById('vehiculo-brand').value.trim(),
      model: document.getElementById('vehiculo-model').value.trim(),
      year_from: intOrNull(document.getElementById('vehiculo-year-from').value),
      year_to:   intOrNull(document.getElementById('vehiculo-year-to').value),
      engine_type: document.getElementById('vehiculo-engine').value || null,
      recommended_product_id: intOrNull(document.getElementById('vehiculo-recommended').value),
      alternative_product_id: intOrNull(document.getElementById('vehiculo-alternative').value),
      notes: document.getElementById('vehiculo-notes').value.trim() || null
    };

    if (!payload.brand || !payload.model || !payload.recommended_product_id) {
      errEl.textContent = 'Marca, modelo y producto recomendado son obligatorios.';
      return;
    }

    const id = document.getElementById('vehiculo-form-id').value;
    const { error } = id
      ? await db.from('vehicle_guide').update(payload).eq('id', parseInt(id))
      : await db.from('vehicle_guide').insert(payload);

    if (error) { errEl.textContent = error.message; return; }
    document.getElementById('vehiculo-modal').classList.add('hidden');
    await refresh();
    window.cgsToast?.(id ? 'Vehículo actualizado.' : 'Vehículo agregado.');
  }

  function confirmDelete(id) {
    const r = _rows.find(x => x.id === id);
    if (!r) return;
    const dlg = document.getElementById('confirm-modal');
    document.getElementById('confirm-msg').textContent =
      `¿Eliminar la entrada "${r.brand} ${r.model}"? Esta acción no se puede deshacer.`;
    dlg.classList.remove('hidden');
    document.getElementById('confirm-yes').onclick = async () => {
      const { error } = await db.from('vehicle_guide').delete().eq('id', id);
      dlg.classList.add('hidden');
      if (error) { window.cgsToast?.('Error al eliminar.', 'error'); return; }
      await refresh();
      window.cgsToast?.('Vehículo eliminado.');
    };
    document.getElementById('confirm-no').onclick = () => dlg.classList.add('hidden');
  }

  // ─── Bind UI ────────────────────────────────────────────────────────────
  function bindUI() {
    document.getElementById('vehiculo-form')?.addEventListener('submit', handleSubmit);
    const searchInput = document.getElementById('vehiculos-search');
    searchInput?.addEventListener('input', () => {
      _search = searchInput.value.trim();
      render();
    });
  }

  // ─── Utils ──────────────────────────────────────────────────────────────
  function intOrNull(v) { const n = parseInt(v); return Number.isFinite(n) ? n : null; }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Public API
  window.AdminVehiculos = { init, refresh, openAdd };
})();
