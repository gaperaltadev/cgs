'use strict';

// Visualización de pedidos. Read-only desde el admin (los pedidos se crean
// solo desde el bot vía RPC transaccional).

(function () {
  const db = window.adminDb;
  let _rows = [];
  let _search = '';
  let _periodo = 'semana';

  const ESTADO_COLOR = {
    pendiente:  '#F59E0B',
    confirmado: '#047857',
    entregado:  '#1565C0',
    cancelado:  '#9CA3AF'
  };

  // ─── Init / refresh ─────────────────────────────────────────────────────
  async function init() {
    if (!db) return console.warn('[pedidos] Supabase no configurado');
    bindUI();
    await refresh();
  }

  async function refresh() {
    const desde = periodoToDate(_periodo);

    let q = db
      .from('pedidos_resumen')
      .select('id, estado, created_at, cliente_ruc, razon_social, ciudad, vendedor_telefono, vendedor_nombre, total_unidades, num_items, notas')
      .order('created_at', { ascending: false })
      .limit(200);

    if (desde) q = q.gte('created_at', desde.toISOString());

    const { data, error } = await q;
    if (error) { console.error('[pedidos]', error); return; }
    _rows = data || [];
    render();
  }

  function periodoToDate(p) {
    if (p === 'todo') return null;
    const d = new Date();
    if (p === 'hoy')    d.setHours(0, 0, 0, 0);
    if (p === 'semana') d.setDate(d.getDate() - 7);
    if (p === 'mes')    d.setMonth(d.getMonth() - 1);
    return d;
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  function render() {
    const tbody = document.getElementById('pedidos-tbody');
    if (!tbody) return;

    const term = _search.toLowerCase();
    const filtered = term
      ? _rows.filter(r =>
          (r.razon_social || '').toLowerCase().includes(term) ||
          (r.cliente_ruc || '').toLowerCase().includes(term) ||
          (r.vendedor_nombre || '').toLowerCase().includes(term) ||
          (r.vendedor_telefono || '').includes(term)
        )
      : _rows;

    const countEl = document.getElementById('pedidos-count');
    if (countEl) {
      const totalUds = filtered.reduce((s, r) => s + (r.total_unidades || 0), 0);
      countEl.textContent = `${filtered.length} pedido${filtered.length !== 1 ? 's' : ''} · ${totalUds} unidades`;
    }

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No hay pedidos en el período seleccionado.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      const fecha = new Date(r.created_at).toLocaleString('es-PY', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      const cliente = `<strong>${escapeHtml(r.razon_social || '—')}</strong>` +
                      (r.cliente_ruc ? `<br><span class="muted">${escapeHtml(r.cliente_ruc)}</span>` : '');
      const vendedor = r.vendedor_nombre
        ? `${escapeHtml(r.vendedor_nombre)}<br><span class="muted">${escapeHtml(r.vendedor_telefono)}</span>`
        : escapeHtml(r.vendedor_telefono || '—');
      const estadoColor = ESTADO_COLOR[r.estado] || '#555';

      return `
        <tr>
          <td><code style="font-size:.85rem;">#${r.id}</code></td>
          <td><span class="muted">${fecha}</span></td>
          <td>${cliente}</td>
          <td>${vendedor}</td>
          <td>${r.num_items} prod · <strong>${r.total_unidades} uds</strong></td>
          <td><span class="cat-pill" style="background:${estadoColor}">${r.estado}</span></td>
          <td>
            <div class="td-actions">
              <button class="action-btn edit-btn" data-detail="${r.id}" title="Ver detalle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-detail]').forEach(btn =>
      btn.addEventListener('click', () => mostrarDetalle(parseInt(btn.dataset.detail))));
  }

  // ─── Detalle ───────────────────────────────────────────────────────────
  async function mostrarDetalle(pedidoId) {
    const dlg  = document.getElementById('pedido-detalle-modal');
    const body = document.getElementById('pedido-detalle-body');
    document.getElementById('pedido-detalle-title').textContent = `Pedido #${pedidoId}`;
    body.innerHTML = 'Cargando…';
    dlg.classList.remove('hidden');

    const [pedRes, itemsRes] = await Promise.all([
      db.from('pedidos_resumen').select('*').eq('id', pedidoId).single(),
      db.from('pedido_items').select('id, product_id, product_name, quantity, unit_price, subtotal').eq('pedido_id', pedidoId)
    ]);

    if (pedRes.error || itemsRes.error) {
      body.innerHTML = '<p class="form-error">No se pudo cargar el pedido.</p>';
      return;
    }

    const p = pedRes.data;
    const items = itemsRes.data || [];
    const fecha = new Date(p.created_at).toLocaleString('es-PY');

    body.innerHTML = `
      <dl class="detail-grid">
        <dt>Cliente</dt>
        <dd><strong>${escapeHtml(p.razon_social || '—')}</strong>${p.ciudad ? ' · ' + escapeHtml(p.ciudad) : ''}<br><code>${escapeHtml(p.cliente_ruc)}</code></dd>

        <dt>Vendedor</dt>
        <dd>${escapeHtml(p.vendedor_nombre || '—')}<br><span class="muted">${escapeHtml(p.vendedor_telefono)}</span></dd>

        <dt>Fecha</dt>
        <dd>${fecha}</dd>

        <dt>Estado</dt>
        <dd><span class="cat-pill" style="background:${ESTADO_COLOR[p.estado] || '#555'}">${p.estado}</span></dd>

        ${p.notas ? `<dt>Notas</dt><dd>${escapeHtml(p.notas)}</dd>` : ''}
      </dl>

      <h4 style="margin:20px 0 8px;color:#003087;">Items (${items.length})</h4>
      <table class="detail-items-table" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid #E5E7EB;">
            <th style="text-align:left;padding:8px 4px;font-size:.8rem;color:#6B7280;">Producto</th>
            <th style="text-align:right;padding:8px 4px;font-size:.8rem;color:#6B7280;">Cant.</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(it => `
            <tr style="border-bottom:1px solid #F3F4F6;">
              <td style="padding:8px 4px;">[${it.product_id}] ${escapeHtml(it.product_name)}</td>
              <td style="padding:8px 4px;text-align:right;"><strong>×${it.quantity}</strong></td>
            </tr>
          `).join('')}
          <tr>
            <td style="padding:12px 4px;text-align:right;font-weight:600;color:#003087;">Total unidades</td>
            <td style="padding:12px 4px;text-align:right;font-weight:700;color:#003087;">${p.total_unidades}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  // ─── Bind UI ────────────────────────────────────────────────────────────
  function bindUI() {
    const searchInput = document.getElementById('pedidos-search');
    searchInput?.addEventListener('input', () => {
      _search = searchInput.value.trim();
      render();
    });
    const periodoSelect = document.getElementById('pedidos-periodo');
    periodoSelect?.addEventListener('change', async () => {
      _periodo = periodoSelect.value;
      await refresh();
    });
  }

  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  window.AdminPedidos = { init, refresh };
})();
