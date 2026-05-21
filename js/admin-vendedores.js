'use strict';

// Gestión de vendedores autorizados a usar el bot.
// Tabla `vendedores` en Supabase.

(function () {
  const db = window.adminDb;
  let _rows = [];
  let _search = '';

  const CATEGORIAS_LABEL = {
    elaion:    'ELAION',
    extravida: 'EXTRAVIDA',
    moto:      'RÖD',
    otros:     'Otros'
  };

  // ─── Init / refresh ─────────────────────────────────────────────────────
  async function init() {
    if (!db) return console.warn('[vendedores] Supabase no configurado');
    bindUI();
    await refresh();
  }

  async function refresh() {
    const { data, error } = await db
      .from('vendedores')
      .select('telefono, nombre, categorias, ciudades, activo, created_at')
      .order('activo', { ascending: false })
      .order('nombre', { ascending: true });
    if (error) { console.error('[vendedores]', error); return; }
    _rows = data || [];
    render();
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  function render() {
    const tbody = document.getElementById('vendedores-tbody');
    if (!tbody) return;

    const term = _search.toLowerCase();
    const filtered = term
      ? _rows.filter(r =>
          (r.nombre || '').toLowerCase().includes(term) ||
          (r.telefono || '').includes(term)
        )
      : _rows;

    const countEl = document.getElementById('vendedores-count');
    if (countEl) {
      const activos = filtered.filter(r => r.activo).length;
      countEl.textContent = `${filtered.length} vendedor${filtered.length !== 1 ? 'es' : ''} · ${activos} activo${activos !== 1 ? 's' : ''}`;
    }

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No hay vendedores cargados.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      const cats = (r.categorias || []).map(c =>
        `<span class="cat-pill" style="background:${catColor(c)};margin-right:4px;">${CATEGORIAS_LABEL[c] || c}</span>`
      ).join('') || '<span class="muted">—</span>';

      const ciudades = (r.ciudades || []).join(', ') || '<span class="muted">—</span>';

      const estado = r.activo
        ? '<span class="cat-pill" style="background:#047857;">Activo</span>'
        : '<span class="cat-pill" style="background:#9CA3AF;">Inactivo</span>';

      return `
        <tr style="${r.activo ? '' : 'opacity:.65;'}">
          <td><code style="font-size:.85rem;">${escapeHtml(r.telefono)}</code></td>
          <td class="td-name"><div class="td-name-inner"><span>${escapeHtml(r.nombre)}</span></div></td>
          <td>${cats}</td>
          <td>${ciudades}</td>
          <td>${estado}</td>
          <td>
            <div class="td-actions">
              <button class="action-btn edit-btn" data-edit="${escapeHtml(r.telefono)}" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="action-btn delete-btn" data-delete="${escapeHtml(r.telefono)}" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-edit]').forEach(btn =>
      btn.addEventListener('click', () => openEdit(btn.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach(btn =>
      btn.addEventListener('click', () => confirmDelete(btn.dataset.delete)));
  }

  function catColor(c) {
    return { elaion:'#003087', extravida:'#001B4D', moto:'#1565C0', otros:'#37474F' }[c] || '#555';
  }

  // ─── Modal handlers ─────────────────────────────────────────────────────
  function openAdd() {
    document.getElementById('vendedor-modal-title').textContent = 'Nuevo vendedor';
    document.getElementById('vendedor-form').reset();
    document.getElementById('vendedor-form-original-telefono').value = '';
    document.getElementById('vendedor-activo').checked = true;
    document.querySelectorAll('input[name="vendedor-cat"]').forEach(c => c.checked = false);
    document.getElementById('vendedor-telefono').disabled = false;
    document.getElementById('vendedor-form-error').textContent = '';
    document.getElementById('vendedor-modal').classList.remove('hidden');
  }

  function openEdit(telefono) {
    const r = _rows.find(x => x.telefono === telefono);
    if (!r) return;
    document.getElementById('vendedor-modal-title').textContent = `Editar: ${r.nombre}`;
    document.getElementById('vendedor-form-original-telefono').value = r.telefono;
    document.getElementById('vendedor-telefono').value = r.telefono;
    document.getElementById('vendedor-telefono').disabled = true;  // no se cambia (es PK)
    document.getElementById('vendedor-nombre').value = r.nombre;
    document.getElementById('vendedor-ciudades').value = (r.ciudades || []).join(', ');
    document.getElementById('vendedor-activo').checked = r.activo;
    document.querySelectorAll('input[name="vendedor-cat"]').forEach(c => {
      c.checked = (r.categorias || []).includes(c.value);
    });
    document.getElementById('vendedor-form-error').textContent = '';
    document.getElementById('vendedor-modal').classList.remove('hidden');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errEl = document.getElementById('vendedor-form-error');
    errEl.textContent = '';

    const isEdit = !!document.getElementById('vendedor-form-original-telefono').value;
    const telefono = document.getElementById('vendedor-telefono').value.trim();
    const nombre   = document.getElementById('vendedor-nombre').value.trim();
    const categorias = Array.from(document.querySelectorAll('input[name="vendedor-cat"]:checked')).map(c => c.value);
    const ciudades = document.getElementById('vendedor-ciudades').value
      .split(',').map(s => s.trim()).filter(Boolean);
    const activo = document.getElementById('vendedor-activo').checked;

    if (!telefono || !nombre) {
      errEl.textContent = 'Teléfono y nombre son obligatorios.';
      return;
    }
    if (!/^\d{10,15}$/.test(telefono)) {
      errEl.textContent = 'Teléfono inválido. Formato internacional sin +, solo dígitos.';
      return;
    }

    const payload = { telefono, nombre, categorias, ciudades, activo, updated_at: new Date().toISOString() };

    const { error } = isEdit
      ? await db.from('vendedores').update(payload).eq('telefono', document.getElementById('vendedor-form-original-telefono').value)
      : await db.from('vendedores').insert(payload);

    if (error) {
      errEl.textContent = error.code === '23505' ? 'Ya existe un vendedor con ese teléfono.' : error.message;
      return;
    }
    document.getElementById('vendedor-modal').classList.add('hidden');
    await refresh();
    window.cgsToast?.(isEdit ? 'Vendedor actualizado.' : 'Vendedor agregado.');
  }

  function confirmDelete(telefono) {
    const r = _rows.find(x => x.telefono === telefono);
    if (!r) return;
    const dlg = document.getElementById('confirm-modal');
    document.getElementById('confirm-msg').textContent =
      `¿Eliminar a "${r.nombre}" (${r.telefono})? Considerá desactivarlo en vez de borrar, así se mantiene el historial de ventas.`;
    dlg.classList.remove('hidden');
    document.getElementById('confirm-yes').onclick = async () => {
      const { error } = await db.from('vendedores').delete().eq('telefono', telefono);
      dlg.classList.add('hidden');
      if (error) {
        window.cgsToast?.(
          error.code === '23503'
            ? 'No se puede borrar: tiene pedidos asociados. Marcalo como inactivo.'
            : 'Error al eliminar.',
          'error'
        );
        return;
      }
      await refresh();
      window.cgsToast?.('Vendedor eliminado.');
    };
    document.getElementById('confirm-no').onclick = () => dlg.classList.add('hidden');
  }

  // ─── Bind UI ────────────────────────────────────────────────────────────
  function bindUI() {
    document.getElementById('vendedor-form')?.addEventListener('submit', handleSubmit);
    const searchInput = document.getElementById('vendedores-search');
    searchInput?.addEventListener('input', () => {
      _search = searchInput.value.trim();
      render();
    });
  }

  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  window.AdminVendedores = { init, refresh, openAdd };
})();
