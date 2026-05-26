'use strict';

// Gestión de presentaciones y precios por producto.
// Tabla `product_presentations` en Supabase.

(function () {
  const db = window.adminDb;
  let _rows     = [];  // product_presentations con datos del producto
  let _products = [];  // todos los productos (para dropdown y filtro)
  let _search   = '';
  let _filterId = '';  // filtro por product_id

  // ─── Init / refresh ─────────────────────────────────────────────────────
  async function init() {
    if (!db) return console.warn('[presentaciones] Supabase no configurado');
    bindUI();
    await Promise.all([loadProducts(), refresh()]);
  }

  async function loadProducts() {
    const { data, error } = await db
      .from('products')
      .select('id, name, category')
      .order('name', { ascending: true });
    if (error) { console.error('[presentaciones] error cargando productos:', error); return; }
    _products = data || [];
    renderProductFilter();
  }

  async function refresh() {
    const { data, error } = await db
      .from('product_presentations')
      .select('id, product_id, label, price_usd, active, sort_order, products(id, name)')
      .order('product_id', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) { console.error('[presentaciones]', error); return; }
    _rows = data || [];
    render();
  }

  function norm(s) {
    return String(s ?? '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // ─── Render principal ────────────────────────────────────────────────────
  function render() {
    const tbody = document.getElementById('pres-tbody');
    if (!tbody) return;

    const term = norm(_search);
    let filtered = _filterId
      ? _rows.filter(r => String(r.product_id) === _filterId)
      : _rows;

    if (term) {
      filtered = filtered.filter(r =>
        norm(r.label).includes(term) ||
        norm(r.products?.name).includes(term)
      );
    }

    const countEl = document.getElementById('pres-count');
    if (countEl) {
      const conPrecio = filtered.filter(r => r.price_usd > 0).length;
      countEl.textContent = `${filtered.length} presentación${filtered.length !== 1 ? 'es' : ''} · ${conPrecio} con precio · ${filtered.length - conPrecio} sin precio`;
    }

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No hay presentaciones.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      const precio = r.price_usd > 0
        ? `<strong style="color:#111827;">USD ${Number(r.price_usd).toFixed(2)}</strong>`
        : `<span style="color:#9CA3AF;">Sin precio</span>`;

      const estado = r.active
        ? '<span class="cat-pill" style="background:#047857;">Activa</span>'
        : '<span class="cat-pill" style="background:#9CA3AF;">Inactiva</span>';

      return `
        <tr style="${r.active ? '' : 'opacity:.6;'}">
          <td class="td-name">
            <div class="td-name-inner">
              <div class="td-color" style="background:${catColor(r.products)}"></div>
              <span>${escapeHtml(r.products?.name || '—')}</span>
            </div>
          </td>
          <td>${escapeHtml(r.label)}</td>
          <td>${precio}</td>
          <td>${estado}</td>
          <td style="color:#6B7280;font-size:.85rem;text-align:center;">${r.sort_order ?? '—'}</td>
          <td>
            <div class="td-actions">
              <button class="action-btn edit-btn" data-edit="${r.id}" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="action-btn delete-btn" data-delete="${r.id}" data-label="${escapeHtml(r.label)}" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-edit]').forEach(btn =>
      btn.addEventListener('click', () => openEdit(Number(btn.dataset.edit))));
    tbody.querySelectorAll('[data-delete]').forEach(btn =>
      btn.addEventListener('click', () => confirmDelete(Number(btn.dataset.delete), btn.dataset.label)));
  }

  function renderProductFilter() {
    const el = document.getElementById('pres-filter-product');
    if (!el) return;
    el.innerHTML = '<option value="">Todos los productos</option>' +
      _products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  }

  function fillModalProductSelect(selectedId, disabled) {
    const sel = document.getElementById('pres-product-id');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Seleccioná un producto —</option>' +
      _products.map(p => `<option value="${p.id}"${p.id === selectedId ? ' selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
    sel.disabled = disabled;
  }

  // ─── Modal: abrir ────────────────────────────────────────────────────────
  function openAdd() {
    document.getElementById('pres-modal-title').textContent = 'Nueva presentación';
    document.getElementById('pres-form').reset();
    document.getElementById('pres-form-id').value = '';
    document.getElementById('pres-active').checked = true;
    document.getElementById('pres-form-error').textContent = '';
    fillModalProductSelect(null, false);
    document.getElementById('pres-modal').classList.remove('hidden');
    document.getElementById('pres-product-id').focus();
  }

  function openEdit(id) {
    const r = _rows.find(x => x.id === id);
    if (!r) return;
    document.getElementById('pres-modal-title').textContent = `Editar: ${r.label}`;
    document.getElementById('pres-form-id').value        = r.id;
    document.getElementById('pres-label').value          = r.label;
    document.getElementById('pres-price-usd').value      = r.price_usd > 0 ? r.price_usd : '';
    document.getElementById('pres-active').checked       = r.active;
    document.getElementById('pres-sort-order').value     = r.sort_order ?? '';
    document.getElementById('pres-form-error').textContent = '';
    fillModalProductSelect(r.product_id, true); // producto no editable
    document.getElementById('pres-modal').classList.remove('hidden');
    document.getElementById('pres-label').focus();
  }

  // ─── Modal: guardar ──────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const errEl  = document.getElementById('pres-form-error');
    errEl.textContent = '';

    const id        = document.getElementById('pres-form-id').value;
    const isEdit    = !!id;
    const productId = Number(document.getElementById('pres-product-id').value);
    const label     = document.getElementById('pres-label').value.trim();
    const priceRaw  = document.getElementById('pres-price-usd').value.trim();
    const priceUsd  = priceRaw !== '' ? Number(priceRaw) : 0;
    const active    = document.getElementById('pres-active').checked;
    const sortOrder = Number(document.getElementById('pres-sort-order').value) || 0;

    if (!productId)            { errEl.textContent = 'Seleccioná un producto.'; return; }
    if (!label)                { errEl.textContent = 'La etiqueta es obligatoria. Ej: Balde 20L'; return; }
    if (isNaN(priceUsd) || priceUsd < 0) { errEl.textContent = 'El precio debe ser un número positivo.'; return; }

    const saveBtn = document.querySelector('#pres-modal .btn-save');
    if (saveBtn) saveBtn.disabled = true;

    const payload = {
      product_id: productId,
      label,
      price_usd:  priceUsd,
      active,
      sort_order: sortOrder,
      updated_at: new Date().toISOString()
    };

    const { error } = isEdit
      ? await db.from('product_presentations').update(payload).eq('id', id)
      : await db.from('product_presentations').insert(payload);

    if (saveBtn) saveBtn.disabled = false;

    if (error) {
      errEl.textContent = error.message;
      return;
    }

    document.getElementById('pres-modal').classList.add('hidden');
    await refresh();
    window.cgsToast?.(isEdit ? 'Presentación actualizada.' : 'Presentación agregada.');
  }

  // ─── Eliminar ────────────────────────────────────────────────────────────
  function confirmDelete(id, label) {
    const dlg = document.getElementById('confirm-modal');
    document.getElementById('confirm-msg').textContent =
      `¿Eliminar la presentación "${label}"? Si tiene pedidos asociados, no se podrá borrar.`;
    dlg.classList.remove('hidden');

    document.getElementById('confirm-yes').onclick = async () => {
      dlg.classList.add('hidden');
      const { error } = await db.from('product_presentations').delete().eq('id', id);
      if (error) {
        window.cgsToast?.(
          error.code === '23503'
            ? 'No se puede eliminar: tiene pedidos asociados.'
            : 'Error al eliminar: ' + error.message,
          'error'
        );
        return;
      }
      await refresh();
      window.cgsToast?.('Presentación eliminada.');
    };
    document.getElementById('confirm-no').onclick = () => dlg.classList.add('hidden');
  }

  // ─── Bind UI ─────────────────────────────────────────────────────────────
  function bindUI() {
    document.getElementById('pres-form')?.addEventListener('submit', handleSubmit);

    document.getElementById('pres-search')?.addEventListener('input', e => {
      _search = e.target.value.trim();
      render();
    });

    document.getElementById('pres-filter-product')?.addEventListener('change', e => {
      _filterId = e.target.value;
      render();
    });
  }

  function catColor(product) {
    const cat = product?.category || '';
    return { elaion: '#003087', extravida: '#001B4D', moto: '#1565C0', otros: '#37474F' }[cat] || '#6B7280';
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  window.AdminPresentaciones = { init, refresh, openAdd };
})();
