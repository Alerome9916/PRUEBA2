import { api, state, fmtUSD, fmtQty, fmtDate, toast, openModal, closeModal, confirmDialog, readForm, esc, levelBadge } from '../core.js';

const canEdit = () => ['admin', 'almacen'].includes(state.user.role);
const isAdmin = () => state.user.role === 'admin';

// ============================ PRODUCTOS ============================
export async function renderProducts(view) {
  const [products, categories] = await Promise.all([api.get('/products'), api.get('/categories')]);
  view.innerHTML = `
    <div class="section-head">
      <div><h3>🥩 Productos</h3><div class="desc">Catálogo con norma COVENIN, registro sanitario y control de stock.</div></div>
      ${canEdit() ? '<button class="btn btn-primary" id="newProd">＋ Nuevo producto</button>' : ''}
    </div>
    <div class="toolbar">
      <input class="search" id="prodSearch" placeholder="🔍 Buscar…" />
      <select id="catFilter" style="max-width:200px"><option value="">Todas las categorías</option>${categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
    </div>
    <div id="prodTable"></div>`;

  const draw = (list) => {
    document.getElementById('prodTable').innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Producto</th><th>Categoría</th><th class="num">Precio</th><th class="num">Stock</th><th>Próx. caducidad</th><th>COVENIN</th><th></th></tr></thead>
        <tbody>${list.map((p) => `
          <tr>
            <td><div style="font-weight:600">${esc(p.name)}</div><div class="faint">${esc(p.sku)}${p.barcode ? ' · ' + esc(p.barcode) : ''}</div></td>
            <td>${p.category_name ? `<span class="tag-soft" style="border-left:3px solid ${p.category_color || '#888'}">${esc(p.category_name)}</span>` : '<span class="faint">—</span>'}</td>
            <td class="num">${fmtUSD(p.sale_price)}<div class="faint">/${p.unit}</div></td>
            <td class="num"><span style="color:${p.stock <= 0 ? '#f87171' : p.low_stock ? '#fbbf24' : '#4ade80'};font-weight:700">${fmtQty(p.stock)}</span>${p.low_stock ? '<div class="faint">bajo mín.</div>' : ''}</td>
            <td>${p.next_expiry ? fmtDate(p.next_expiry) : '<span class="faint">sin lotes</span>'}</td>
            <td class="faint">${esc(p.covenin_norm || '—')}</td>
            <td class="num">${canEdit() ? `<button class="btn btn-sm btn-ghost" data-edit="${p.id}">✏️</button>` : ''}</td>
          </tr>`).join('') || '<tr><td colspan="7" class="empty">Sin productos</td></tr>'}
        </tbody></table></div>`;
    document.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => productForm(categories, products.find((x) => x.id === Number(b.dataset.edit))));
  };
  draw(products);

  const filter = () => {
    const q = document.getElementById('prodSearch').value.toLowerCase();
    const cat = document.getElementById('catFilter').value;
    draw(products.filter((p) => (!q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)) && (!cat || p.category_id == cat)));
  };
  document.getElementById('prodSearch').oninput = filter;
  document.getElementById('catFilter').onchange = filter;
  if (canEdit()) document.getElementById('newProd').onclick = () => productForm(categories, null);
}

function productForm(categories, p) {
  const v = p || {};
  openModal({
    title: p ? 'Editar producto' : 'Nuevo producto',
    size: 'lg',
    bodyHTML: `<form id="pForm"><div class="form-grid">
      <div><label>SKU *</label><input name="sku" value="${esc(v.sku || '')}" ${p ? 'readonly' : ''} required></div>
      <div><label>Código de barras</label><input name="barcode" value="${esc(v.barcode || '')}"></div>
      <div class="full"><label>Nombre *</label><input name="name" value="${esc(v.name || '')}" required></div>
      <div><label>Categoría</label><select name="category_id">${categories.map((c) => `<option value="${c.id}" ${v.category_id == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div><label>Unidad</label><select name="unit"><option value="kg" ${v.unit === 'kg' ? 'selected' : ''}>Kilogramo (kg)</option><option value="unidad" ${v.unit === 'unidad' ? 'selected' : ''}>Unidad</option></select></div>
      <div><label>Costo (USD)</label><input type="number" step="0.01" name="cost_price" value="${v.cost_price ?? 0}"></div>
      <div><label>Precio venta (USD)</label><input type="number" step="0.01" name="sale_price" value="${v.sale_price ?? 0}"></div>
      <div><label>Stock mínimo</label><input type="number" step="0.1" name="min_stock" value="${v.min_stock ?? 0}"></div>
      <div><label>Stock máximo</label><input type="number" step="0.1" name="max_stock" value="${v.max_stock ?? 0}"></div>
      <div><label>Temp. mín. (°C)</label><input type="number" step="0.5" name="storage_temp_min" value="${v.storage_temp_min ?? ''}"></div>
      <div><label>Temp. máx. (°C)</label><input type="number" step="0.5" name="storage_temp_max" value="${v.storage_temp_max ?? ''}"></div>
      <div><label>Norma COVENIN</label><input name="covenin_norm" value="${esc(v.covenin_norm || '')}" placeholder="COVENIN 1088"></div>
      <div><label>Registro sanitario</label><input name="sanitary_reg" value="${esc(v.sanitary_reg || '')}"></div>
      <div class="full"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="iva_exempt" ${v.iva_exempt ? 'checked' : ''} style="width:auto"> Exento de IVA</label></div>
    </div></form>`,
    footHTML: `${p && isAdmin() ? '<button class="btn btn-danger" data-del style="margin-right:auto">Desactivar</button>' : ''}<button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>`,
    onMount: (modal, close) => {
      modal.querySelector('[data-cancel]').onclick = close;
      modal.querySelector('[data-save]').onclick = async () => {
        const data = readForm(modal.querySelector('#pForm'));
        try {
          if (p) await api.put('/products/' + p.id, data); else await api.post('/products', data);
          toast('Producto guardado', 'ok'); close(); renderProducts(document.getElementById('view'));
        } catch (e) { toast(e.message, 'err'); }
      };
      modal.querySelector('[data-del]')?.addEventListener('click', () => confirmDialog('¿Desactivar este producto?', async () => {
        try { await api.del('/products/' + p.id); toast('Producto desactivado'); close(); renderProducts(document.getElementById('view')); } catch (e) { toast(e.message, 'err'); }
      }));
    },
  });
}

// ============================ CATEGORÍAS ============================
export async function renderCategories(view) {
  const cats = await api.get('/categories');
  view.innerHTML = `
    <div class="section-head">
      <div><h3>🏷️ Categorías</h3><div class="desc">Agrupación de productos con requisitos de cadena de frío y vida útil.</div></div>
      ${canEdit() ? '<button class="btn btn-primary" id="newCat">＋ Nueva categoría</button>' : ''}
    </div>
    <div class="grid cards-3">
      ${cats.map((c) => `
        <div class="card" style="border-left:4px solid ${c.color}">
          <div class="row between"><div class="card-title">${esc(c.name)}</div>${canEdit() ? `<button class="btn btn-sm btn-ghost" data-edit="${c.id}">✏️</button>` : ''}</div>
          <div class="faint mb">${esc(c.description || '')}</div>
          <div class="row" style="gap:8px;flex-wrap:wrap">
            <span class="tag-soft">${c.product_count} productos</span>
            ${c.requires_refrigeration ? '<span class="badge b-info">❄️ Refrigeración</span>' : '<span class="tag-soft">Anaquel</span>'}
            ${c.storage_temp_min != null ? `<span class="tag-soft">${c.storage_temp_min}–${c.storage_temp_max}°C</span>` : ''}
            <span class="tag-soft">Vida útil ${c.default_shelf_life_days}d</span>
          </div>
        </div>`).join('')}
    </div>`;
  if (canEdit()) document.getElementById('newCat').onclick = () => categoryForm(null);
  document.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => categoryForm(cats.find((c) => c.id === Number(b.dataset.edit))));
}

function categoryForm(c) {
  const v = c || {};
  openModal({
    title: c ? 'Editar categoría' : 'Nueva categoría',
    bodyHTML: `<form id="cForm"><div class="form-grid">
      <div class="full"><label>Nombre *</label><input name="name" value="${esc(v.name || '')}" required></div>
      <div class="full"><label>Descripción</label><input name="description" value="${esc(v.description || '')}"></div>
      <div><label>Temp. mín (°C)</label><input type="number" step="0.5" name="storage_temp_min" value="${v.storage_temp_min ?? ''}"></div>
      <div><label>Temp. máx (°C)</label><input type="number" step="0.5" name="storage_temp_max" value="${v.storage_temp_max ?? ''}"></div>
      <div><label>Vida útil (días)</label><input type="number" name="default_shelf_life_days" value="${v.default_shelf_life_days ?? 30}"></div>
      <div><label>Color</label><input type="color" name="color" value="${v.color || '#8b5cf6'}" style="height:42px;padding:4px"></div>
      <div class="full"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="requires_refrigeration" ${v.requires_refrigeration ?? 1 ? 'checked' : ''} style="width:auto"> Requiere refrigeración (cadena de frío)</label></div>
    </div></form>`,
    footHTML: `<button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>`,
    onMount: (modal, close) => {
      modal.querySelector('[data-cancel]').onclick = close;
      modal.querySelector('[data-save]').onclick = async () => {
        const data = readForm(modal.querySelector('#cForm'));
        try { if (c) await api.put('/categories/' + c.id, data); else await api.post('/categories', data); toast('Categoría guardada', 'ok'); close(); renderCategories(document.getElementById('view')); } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}

// ============================ PROVEEDORES ============================
export async function renderSuppliers(view) {
  const sups = await api.get('/suppliers');
  view.innerHTML = `
    <div class="section-head">
      <div><h3>🚚 Proveedores</h3><div class="desc">Registro con RIF y permiso sanitario INSAI.</div></div>
      ${canEdit() ? '<button class="btn btn-primary" id="newSup">＋ Nuevo proveedor</button>' : ''}
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Proveedor</th><th>RIF</th><th>Contacto</th><th>Permiso INSAI</th><th class="num">Lotes</th><th></th></tr></thead>
      <tbody>${sups.map((s) => `<tr>
        <td><div style="font-weight:600">${esc(s.name)}</div><div class="faint">${esc(s.address || '')}</div></td>
        <td>${esc(s.rif || '—')}</td>
        <td>${esc(s.contact || '—')}<div class="faint">${esc(s.phone || '')}</div></td>
        <td>${s.sanitary_permit ? `<span class="badge b-info">${esc(s.sanitary_permit)}</span>` : '<span class="faint">—</span>'}</td>
        <td class="num">${s.batch_count}</td>
        <td class="num">${canEdit() ? `<button class="btn btn-sm btn-ghost" data-edit="${s.id}">✏️</button>` : ''}</td>
      </tr>`).join('') || '<tr><td colspan="6" class="empty">Sin proveedores</td></tr>'}</tbody>
    </table></div>`;
  if (canEdit()) document.getElementById('newSup').onclick = () => supplierForm(null);
  document.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => supplierForm(sups.find((s) => s.id === Number(b.dataset.edit))));
}

function supplierForm(s) {
  const v = s || {};
  openModal({
    title: s ? 'Editar proveedor' : 'Nuevo proveedor',
    bodyHTML: `<form id="sForm"><div class="form-grid">
      <div class="full"><label>Nombre *</label><input name="name" value="${esc(v.name || '')}" required></div>
      <div><label>RIF</label><input name="rif" value="${esc(v.rif || '')}" placeholder="J-00000000-0"></div>
      <div><label>Permiso sanitario (INSAI)</label><input name="sanitary_permit" value="${esc(v.sanitary_permit || '')}"></div>
      <div><label>Contacto</label><input name="contact" value="${esc(v.contact || '')}"></div>
      <div><label>Teléfono</label><input name="phone" value="${esc(v.phone || '')}"></div>
      <div><label>Email</label><input name="email" value="${esc(v.email || '')}"></div>
      <div class="full"><label>Dirección</label><input name="address" value="${esc(v.address || '')}"></div>
    </div></form>`,
    footHTML: `<button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>`,
    onMount: (modal, close) => {
      modal.querySelector('[data-cancel]').onclick = close;
      modal.querySelector('[data-save]').onclick = async () => {
        const data = readForm(modal.querySelector('#sForm'));
        try { if (s) await api.put('/suppliers/' + s.id, data); else await api.post('/suppliers', data); toast('Proveedor guardado', 'ok'); close(); renderSuppliers(document.getElementById('view')); } catch (e) { toast(e.message, 'err'); }
      };
    },
  });
}
