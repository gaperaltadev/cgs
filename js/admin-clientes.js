'use strict';

// Gestión de clientes identificados por RUC.
// Tabla `clientes` en Supabase.

(function () {
  const db = window.adminDb;
  let _rows = [];
  let _search = '';

  // ─── Init / refresh ─────────────────────────────────────────────────────
  async function init() {
    if (!db) return console.warn('[clientes] Supabase no configurado');
    bindUI();
    await refresh();
  }

  async function refresh() {
    const { data, error } = await db
      .from('clientes')
      .select('ruc, razon_social, ciudad, contacto, telefono, notas, created_at, created_by')
      .order('razon_social', { ascending: true });
    if (error) { console.error('[clientes]', error); return; }
    _rows = data || [];
    render();
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  function render() {
    const tbody = document.getElementById('clientes-tbody');
    if (!tbody) return;

    const term = _search.toLowerCase();
    const filtered = term
      ? _rows.filter(r =>
          (r.razon_social || '').toLowerCase().includes(term) ||
          (r.ruc || '').toLowerCase().includes(term) ||
          (r.ciudad || '').toLowerCase().includes(term)
        )
      : _rows;

    const countEl = document.getElementById('clientes-count');
    if (countEl) countEl.textContent = `${filtered.length} cliente${filtered.length !== 1 ? 's' : ''}`;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No hay clientes cargados.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      const fecha = r.created_at
        ? new Date(r.created_at).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: '2-digit' })
        : '—';
      const contacto = r.contacto
        ? `${escapeHtml(r.contacto)}${r.telefono ? '<br><span class="muted">' + escapeHtml(r.telefono) + '</span>' : ''}`
        : (r.telefono ? `<span class="muted">${escapeHtml(r.telefono)}</span>` : '<span class="muted">—</span>');

      return `
        <tr>
          <td><code style="font-size:.85rem;">${escapeHtml(r.ruc)}</code></td>
          <td class="td-name"><div class="td-name-inner"><span>${escapeHtml(r.razon_social)}</span></div></td>
          <td>${r.ciudad ? escapeHtml(r.ciudad) : '<span class="muted">—</span>'}</td>
          <td>${contacto}</td>
          <td><span class="muted">${fecha}</span></td>
          <td>
            <div class="td-actions">
              <button class="action-btn edit-btn" data-edit="${escapeHtml(r.ruc)}" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="action-btn delete-btn" data-delete="${escapeHtml(r.ruc)}" title="Eliminar">
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

  // ─── Modal handlers ─────────────────────────────────────────────────────
  function openAdd() {
    document.getElementById('cliente-modal-title').textContent = 'Nuevo cliente';
    document.getElementById('cliente-form').reset();
    document.getElementById('cliente-form-original-ruc').value = '';
    document.getElementById('cliente-ruc').disabled = false;
    document.getElementById('cliente-form-error').textContent = '';
    document.getElementById('cliente-modal').classList.remove('hidden');
  }

  function openEdit(ruc) {
    const r = _rows.find(x => x.ruc === ruc);
    if (!r) return;
    document.getElementById('cliente-modal-title').textContent = `Editar: ${r.razon_social}`;
    document.getElementById('cliente-form-original-ruc').value = r.ruc;
    document.getElementById('cliente-ruc').value = r.ruc;
    document.getElementById('cliente-ruc').disabled = true;  // PK no se cambia
    document.getElementById('cliente-razon').value = r.razon_social;
    document.getElementById('cliente-ciudad').value = r.ciudad || '';
    document.getElementById('cliente-contacto').value = r.contacto || '';
    document.getElementById('cliente-telefono').value = r.telefono || '';
    document.getElementById('cliente-notas').value = r.notas || '';
    document.getElementById('cliente-form-error').textContent = '';
    document.getElementById('cliente-modal').classList.remove('hidden');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errEl = document.getElementById('cliente-form-error');
    errEl.textContent = '';

    const isEdit = !!document.getElementById('cliente-form-original-ruc').value;
    const ruc = document.getElementById('cliente-ruc').value.trim();
    const razon_social = document.getElementById('cliente-razon').value.trim();

    if (!ruc || !razon_social) {
      errEl.textContent = 'RUC y razón social son obligatorios.';
      return;
    }

    const payload = {
      ruc,
      razon_social,
      ciudad: document.getElementById('cliente-ciudad').value.trim() || null,
      contacto: document.getElementById('cliente-contacto').value.trim() || null,
      telefono: document.getElementById('cliente-telefono').value.trim() || null,
      notas: document.getElementById('cliente-notas').value.trim() || null,
      updated_at: new Date().toISOString()
    };

    const { error } = isEdit
      ? await db.from('clientes').update(payload).eq('ruc', document.getElementById('cliente-form-original-ruc').value)
      : await db.from('clientes').insert(payload);

    if (error) {
      errEl.textContent = error.code === '23505' ? 'Ya existe un cliente con ese RUC.' : error.message;
      return;
    }
    document.getElementById('cliente-modal').classList.add('hidden');
    await refresh();
    window.cgsToast?.(isEdit ? 'Cliente actualizado.' : 'Cliente agregado.');
  }

  function confirmDelete(ruc) {
    const r = _rows.find(x => x.ruc === ruc);
    if (!r) return;
    const dlg = document.getElementById('confirm-modal');
    document.getElementById('confirm-msg').textContent =
      `¿Eliminar a "${r.razon_social}" (RUC ${r.ruc})? No se podrá si tiene pedidos asociados.`;
    dlg.classList.remove('hidden');
    document.getElementById('confirm-yes').onclick = async () => {
      const { error } = await db.from('clientes').delete().eq('ruc', ruc);
      dlg.classList.add('hidden');
      if (error) {
        window.cgsToast?.(
          error.code === '23503'
            ? 'No se puede borrar: tiene pedidos asociados.'
            : 'Error al eliminar.',
          'error'
        );
        return;
      }
      await refresh();
      window.cgsToast?.('Cliente eliminado.');
    };
    document.getElementById('confirm-no').onclick = () => dlg.classList.add('hidden');
  }

  // ─── Bind UI ────────────────────────────────────────────────────────────
  function bindUI() {
    document.getElementById('cliente-form')?.addEventListener('submit', handleSubmit);
    const searchInput = document.getElementById('clientes-search');
    searchInput?.addEventListener('input', () => {
      _search = searchInput.value.trim();
      render();
    });
  }

  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  window.AdminClientes = { init, refresh, openAdd };
})();
