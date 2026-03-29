'use strict';
/* ── STATE ── */
const A = '/api';
let tok = localStorage.getItem('nt') || null, me = null, cart = null,
    prods = [], cats = [], cat = '', q = '', srt = '', stmr = null, curP = null, mQty = 1,
    galImgs = [], galIdx = 0;   // gallery state

/* ── THEME ── */
; (function () { const t = localStorage.getItem('nth') || 'dark'; _applyT(t) })();
function _applyT(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('nth', t);
    G('dark-opt')?.classList.toggle('on', t === 'dark');
    G('light-opt')?.classList.toggle('on', t === 'light');
}
function setThm(t) { _applyT(t) }

/* ── VIEWS ── */
function sv(id) { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); G('v-' + id).classList.add('active'); window.scrollTo({ top: 0, behavior: 'instant' }) }
function goHome() { sv('home') }
function goCart() { sv('cart'); loadCart() }
function goAcc() { sv('acc'); loadAcc() }
function goOrders() { sv('orders'); loadOrders() }

/* ── API ── */
async function ap(m, p, b = null) {
    const h = { 'Content-Type': 'application/json' };
    if (tok) h['Authorization'] = 'Token ' + tok;
    const c = { method: m, headers: h };
    if (b) c.body = JSON.stringify(b);
    const r = await fetch(A + p, c);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw d;
    return d;
}

/* ── AUTH ── */
async function loadMe() {
    if (!tok) return;
    try { me = await ap('GET', '/auth/me/'); syncUI(); cart = await ap('GET', '/cart/'); updBadge() }
    catch { tok = null; me = null; localStorage.removeItem('nt'); syncUI() }
}
function syncUI() {
    const ok = !!(tok && me);
    G('gnav').style.display = ok ? 'none' : 'block';
    G('um').style.display = ok ? 'block' : 'none';
    if (ok) { const n = me.first_name || me.username; G('unav-nm').textContent = n; G('unav-av').textContent = n[0].toUpperCase() }
}
async function doLogin() {
    clrE('le');
    try {
        const d = await ap('POST', '/auth/login/', { username: G('lu').value.trim(), password: G('lp').value });
        tok = d.token; me = d.user; localStorage.setItem('nt', tok); syncUI(); closeM('am');
        cart = await ap('GET', '/cart/'); updBadge();
        toast('s', `Welcome back, ${d.user.first_name || d.user.username}! 👋`);
    } catch (e) { shwE('le', e.error || 'Invalid credentials') }
}
async function doReg() {
    clrE('re2');
    const pl = { username: G('ru').value.trim(), email: G('re').value.trim(), first_name: G('rfn').value.trim(), last_name: G('rln').value.trim(), password: G('rp').value, password2: G('rp2').value };
    try {
        const d = await ap('POST', '/auth/register/', pl);
        tok = d.token; me = d.user; localStorage.setItem('nt', tok); syncUI(); closeM('am');
        cart = await ap('GET', '/cart/'); updBadge();
        toast('s', 'Account created! Welcome to NOVA 🎉 You have $500 to start.');
    } catch (e) { shwE('re2', Object.values(e).flat().join(' · ') || 'Registration failed') }
}
async function doLogout() {
    try { await ap('POST', '/auth/logout/') } catch { }
    tok = null; me = null; cart = null; localStorage.removeItem('nt'); syncUI(); updBadge(); goHome(); toast('i', 'Signed out.');
}
async function doDelAcc() {
    try { await ap('DELETE', '/auth/delete/'); tok = null; me = null; cart = null; localStorage.removeItem('nt'); syncUI(); updBadge(); goHome(); toast('i', 'Account deleted. Goodbye! 👋') }
    catch { toast('e', 'Could not delete account.') }
}
function confLogout() { showConf('Sign Out', 'Are you sure you want to sign out?', doLogout) }
function confDel() { closeUm(); showConf('Delete Account', '⚠️ This permanently deletes your account and all data. This cannot be undone.', doDelAcc) }

/* ── PRODUCTS ── */
async function loadCats() {
    try {
        cats = await ap('GET', '/categories/');
        const s = G('cats');
        s.innerHTML = '<span class="pill on" onclick="pickCat(\'\')" data-cat="">All</span>';
        cats.forEach(c => { const el = document.createElement('span'); el.className = 'pill'; el.dataset.cat = c.slug; el.textContent = c.name; el.onclick = () => pickCat(c.slug); s.appendChild(el) });
    } catch { }
}
async function loadProds(q2 = '', c2 = '') {
    showSkel(8);
    try {
        let u = '/products/?';
        if (q2) u += 'q=' + encodeURIComponent(q2) + '&';
        if (c2) u += 'category=' + encodeURIComponent(c2) + '&';
        prods = await ap('GET', u); renderProds();
    } catch { G('pgrid').innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="eico">⚠️</div><div class="etitle">Failed to load products</div></div>' }
}
function renderProds() {
    let ps = [...prods];
    if (srt === 'pa') ps.sort((a, b) => a.price - b.price);
    if (srt === 'pd') ps.sort((a, b) => b.price - a.price);
    if (srt === 'na') ps.sort((a, b) => a.name.localeCompare(b.name));
    const cn = cat ? cats.find(c => c.slug === cat)?.name : '';
    G('gtitle').textContent = q ? `"${q}"` : cn || 'All Products';
    const ct = G('gcnt'); ct.textContent = ps.length + (ps.length === 1 ? ' item' : ' items'); ct.style.display = 'inline-block';
    if (!ps.length) {
        G('pgrid').innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="eico">🔍</div><div class="etitle">No products found</div><p class="esub">Try a different search or category</p><button class="btn ba bsm" onclick="clrSrch()">Clear</button></div>`;
        return;
    }
    G('pgrid').innerHTML = ps.map((p, i) => {
        const pr = parseFloat(p.price).toFixed(2), im = p.display_image,
            isO = p.stock === 0, isL = p.stock > 0 && p.stock <= 5;
        const bdg = isO ? '<span class="bdg bo">Out of Stock</span>' : isL ? `<span class="bdg bl">Only ${p.stock} left</span>` : i < 3 ? '<span class="bdg bn">New</span>' : '';
        return `<div class="pc" style="animation-delay:${i * .045}s" onclick="openProd(${p.id})">
      <div class="pc-iw">
        ${im ? `<img class="pc-img" src="${im}" alt="${es(p.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ``}
        <div class="pc-ph" style="${im ? 'display:none' : ''}">📦</div>
        ${bdg}
      </div>
      <div class="pc-b">
        <div class="pc-cat">${es(p.category_name || 'General')}</div>
        <div class="pc-name">${es(p.name)}</div>
        <div class="pc-ft">
          <span class="pc-price">$${pr}</span>
          <button class="pc-add" ${isO ? 'disabled' : ''} onclick="event.stopPropagation();qAdd(${p.id})" title="Add to cart">${isO ? '✕' : '+'}</button>
        </div>
      </div>
    </div>`;
    }).join('');
}
function showSkel(n) { G('pgrid').innerHTML = Array.from({ length: n }, () => `<div class="sk-card"><div class="sk sk-img"></div><div class="sk sk-ln"></div><div class="sk sk-sh"></div><div class="sk sk-pr"></div></div>`).join('') }
function pickCat(s) { cat = s; document.querySelectorAll('.pill').forEach(p => p.classList.toggle('on', p.dataset.cat === s)); loadProds(q, s) }
function onSrch(v) { clearTimeout(stmr); stmr = setTimeout(() => { q = v; loadProds(v, cat) }, 300) }
function onSort(v) { srt = v; renderProds() }
function clrSrch() { G('si').value = ''; q = ''; cat = ''; document.querySelectorAll('.pill').forEach(p => p.classList.toggle('on', p.dataset.cat === '')); loadProds() }

/* ── PRODUCT DETAIL + GALLERY ── */
async function openProd(id) {
    try {
        curP = await ap('GET', `/products/${id}/`); mQty = 1;

        // text fields
        G('pm-nm').textContent = curP.name;
        G('pm-pr').textContent = '$' + parseFloat(curP.price).toFixed(2);
        G('pm-cat').textContent = curP.category_name || 'General';
        G('pm-desc').textContent = curP.description;
        G('pm-qty').textContent = 1;

        // stock label
        const s = curP.stock, se = G('pm-stk');
        se.className = 'di-stk ' + (s === 0 ? 'sout' : s <= 5 ? 'slow' : 'sok');
        se.textContent = s === 0 ? '✕ Out of stock' : s <= 5 ? `⚠ Only ${s} left in stock` : `✓ ${s} units in stock`;

        // add button
        const ab = G('pm-add'); ab.disabled = s === 0; ab.textContent = s === 0 ? 'Out of Stock' : 'Add to Cart 🛒';

        // ── build gallery image list ──
        galImgs = [];
        // use images[] array from API first (the new ProductImage model)
        if (curP.images && curP.images.length > 0) {
            curP.images.forEach(img => { if (img.image_url) galImgs.push(img.image_url); });
        }
        // fall back to legacy display_image if gallery is empty
        if (galImgs.length === 0 && curP.display_image) galImgs.push(curP.display_image);
        // last resort placeholder
        if (galImgs.length === 0) galImgs.push('');

        galIdx = 0;
        renderGallery();
        openM('pm');
    } catch { toast('e', 'Failed to load product.') }
}

function renderGallery() {
    const total = galImgs.length;
    const url = galImgs[galIdx] || '';
    const imgEl = G('pm-img'), phEl = G('pm-ph');

    // swap main image with fade
    zoomed = false; imgEl.style.transform = 'scale(1)'; imgEl.style.cursor = 'zoom-in';
    imgEl.style.opacity = '0';
    imgEl.style.opacity = '0';
    setTimeout(() => {
        if (url) { imgEl.src = url; imgEl.style.display = 'block'; phEl.style.display = 'none'; }
        else { imgEl.style.display = 'none'; phEl.style.display = 'flex'; }
        imgEl.style.opacity = '1';
    }, 120);

    // arrows — only show if more than 1 image
    const multi = total > 1;
    G('arr-l').style.display = multi ? 'flex' : 'none';
    G('arr-r').style.display = multi ? 'flex' : 'none';
    G('gal-cnt').style.display = multi ? 'block' : 'none';
    G('gal-cnt').textContent = `${galIdx + 1} / ${total}`;

    // thumbnail strip
    const strip = G('pm-thumbs');
    strip.innerHTML = '';
    if (multi) {
        galImgs.forEach((src, i) => {
            const t = document.createElement('img');
            t.src = src;
            t.style.cssText = `
        width:70px;height:70px;object-fit:cover;border-radius:10px;
        cursor:pointer;flex-shrink:0;transition:all .2s ease;
        border:2px solid ${i === galIdx ? 'var(--a)' : 'var(--border)'};
        opacity:${i === galIdx ? '1' : '0.55'};
      `;
            t.onclick = () => { galIdx = i; renderGallery(); };
            strip.appendChild(t);
        });
        // scroll active thumb into view
        setTimeout(() => { strip.children[galIdx]?.scrollIntoView({ inline: 'nearest', behavior: 'smooth' }); }, 80);
    }
}

function galNav(dir) {
    galIdx = (galIdx + dir + galImgs.length) % galImgs.length;
    renderGallery();
}

function dq(d) { if (!curP) return; mQty = Math.max(1, Math.min(mQty + d, curP.stock || 99)); G('pm-qty').textContent = mQty }
async function addFM() {
    if (!tok) { closeM('pm'); openM('am'); return }
    try { cart = await ap('POST', '/cart/add/', { product_id: curP.id, quantity: mQty }); updBadge(); closeM('pm'); toast('s', `${curP.name} × ${mQty} added! 🛒`) }
    catch (e) { toast('e', e.error || 'Could not add to cart.') }
}
async function qAdd(id) {
    if (!tok) { openM('am'); return }
    try { cart = await ap('POST', '/cart/add/', { product_id: id, quantity: 1 }); updBadge(); const p = prods.find(x => x.id === id); toast('s', `${p?.name || 'Item'} added to cart!`) }
    catch (e) { toast('e', e.error || 'Could not add to cart.') }
}

/* ── CART ── */
async function loadCart() {
    if (!tok) { G('citems').innerHTML = `<div class="aw"><div class="awi">🔐</div><h2>Sign in to view cart</h2><p>Create a free account to start shopping.</p><button class="btn ba blg" onclick="openM('am')">Sign In / Register</button></div>`; G('csub').textContent = '—'; return }
    G('citems').innerHTML = '<div class="cload"><div class="spin"></div> Loading cart…</div>';
    try {
        cart = await ap('GET', '/cart/'); renderCart(); updBadge();
        const b = await ap('GET', '/balance/');
        const bp = G('bpill'), bd = G('bdisp'), bl = parseFloat(b.balance), tot = parseFloat(cart?.total || 0);
        bp.style.display = 'flex'; bd.textContent = '$' + bl.toFixed(2); bd.style.color = bl >= tot ? 'var(--suc)' : 'var(--dan)';
    } catch { toast('e', 'Could not load cart.') }
}
function renderCart() {
    const its = cart?.items || [];
    G('csub').textContent = `${cart?.item_count || 0} item${cart?.item_count !== 1 ? 's' : ''}`;
    if (!its.length) {
        G('citems').innerHTML = `<div class="empty"><div class="eico">🛒</div><div class="etitle">Your cart is empty</div><p class="esub">Add items and come back here!</p><button class="btn ba" onclick="goHome()">Browse Products</button></div>`;
        G('slines').innerHTML = ''; G('stot').textContent = '$0.00'; return;
    }
    G('citems').innerHTML = its.map(it => {
        const img = it.product.display_image; return `
    <div class="ci"><${img ? `img class="ci-img" src="${img}" alt="${es(it.product.name)}" onerror="this.outerHTML='<div class=ci-ph>📦</div>'">` : `div class="ci-ph">📦<`}/div>
      <div class="ci-bd"><div class="ci-name">${es(it.product.name)}</div><div class="ci-unit">$${parseFloat(it.product.price).toFixed(2)} each</div><div class="ci-sub">$${parseFloat(it.subtotal).toFixed(2)}</div></div>
      <div class="ci-act">
        <div class="cqbox"><button class="cqb" onclick="updIt(${it.id},${it.quantity - 1})">−</button><span class="cqv">${it.quantity}</span><button class="cqb" onclick="updIt(${it.id},${it.quantity + 1})">+</button></div>
        <button class="cdl" onclick="remIt(${it.id})" title="Remove">🗑</button>
      </div>
    </div>`}).join('');
    G('slines').innerHTML = its.map(i => `<div class="sr"><span>${es(i.product.name)} × ${i.quantity}</span><span>$${parseFloat(i.subtotal).toFixed(2)}</span></div>`).join('');
    G('stot').textContent = '$' + parseFloat(cart?.total || 0).toFixed(2);
}
async function updIt(id, q2) {
    try { cart = await ap('PATCH', `/cart/update/${id}/`, { quantity: q2 }); renderCart(); updBadge(); const b = await ap('GET', '/balance/'); const bl = parseFloat(b.balance), tot = parseFloat(cart?.total || 0); G('bdisp').textContent = '$' + bl.toFixed(2); G('bdisp').style.color = bl >= tot ? 'var(--suc)' : 'var(--dan)' }
    catch (e) { toast('e', e.error || 'Update failed') }
}
async function remIt(id) { try { cart = await ap('DELETE', `/cart/remove/${id}/`); renderCart(); updBadge(); toast('i', 'Item removed.') } catch { toast('e', 'Could not remove item.') } }
function updBadge() { const n = cart?.item_count || 0; const b = G('cbadge'); b.textContent = n; b.style.display = n > 0 ? 'flex' : 'none' }

/* ── CHECKOUT ── */
async function doChk() {
    if (!tok) { openM('am'); return }
    if (!cart?.items?.length) { toast('e', 'Your cart is empty.'); return }
    const btn = G('chkbtn'); btn.disabled = true; btn.textContent = '⏳ Processing…';
    try {
        const d = await ap('POST', '/checkout/'); cart = null; updBadge();
        toast('s', `✅ Order #${d.order.id} placed! $${d.amount_deducted} deducted. Balance: $${parseFloat(d.new_balance).toFixed(2)}`);
        goOrders();
    } catch (e) { toast('e', e.error || 'Checkout failed. Try again.') }
    finally { btn.disabled = false; btn.innerHTML = '⚡ Checkout Now' }
}

/* ── ACCOUNT ── */
async function loadAcc() {
    if (!tok) { goHome(); openM('am'); return }
    try {
        const u = await ap('GET', '/auth/me/'); me = u;
        const n = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;
        G('aav').textContent = n[0].toUpperCase(); G('aname').textContent = n; G('aemail').textContent = u.email || 'No email set';
        G('abamt').textContent = '$' + parseFloat(u.balance || 0).toFixed(2);
        G('asince').textContent = 'Member since ' + new Date(u.date_joined).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch { }
}
async function doTopup() {
    const a = parseFloat(G('tuamt').value);
    if (!a || a <= 0 || a > 10000) { toast('e', 'Enter a valid amount (1–10,000).'); return }
    try { const d = await ap('POST', '/balance/topup/', { amount: a }); G('abamt').textContent = '$' + parseFloat(d.balance).toFixed(2); G('tuamt').value = ''; toast('s', d.message) }
    catch (e) { toast('e', e.error || 'Top-up failed') }
}

/* ── ORDERS ── */
async function loadOrders() {
    if (!tok) { goHome(); openM('am'); return }
    G('olist').innerHTML = '<div class="cload"><div class="spin"></div> Loading orders…</div>';
    try {
        const os = await ap('GET', '/orders/');
        if (!os.length) { G('olist').innerHTML = `<div class="empty"><div class="eico">📦</div><div class="etitle">No orders yet</div><p class="esub">Your completed orders will appear here.</p><button class="btn ba" onclick="goHome()">Start Shopping</button></div>`; return }
        const sc = { 'paid': 'sp', 'pending': 'spe', 'shipped': 'ssh' };
        G('olist').innerHTML = os.map((o, i) => `
      <div class="oc" style="animation-delay:${i * .05}s">
        <div class="och">
          <div><div class="oid">Order #${o.id}</div><div class="odt">${new Date(o.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div></div>
          <div style="text-align:right"><span class="ost ${sc[o.status] || 'spe'}">${o.status}</span><div class="otot">$${parseFloat(o.total_amount).toFixed(2)}</div></div>
        </div>
        <div class="oit">${o.items.map(it => `<div class="oil"><span>${es(it.product_name)} × ${it.quantity}</span><span>$${parseFloat(it.subtotal).toFixed(2)}</span></div>`).join('')}</div>
      </div>`).join('');
    } catch { G('olist').innerHTML = `<div class="empty"><div class="etitle">Failed to load orders.</div></div>` }
}

/* ── MODALS ── */
function openM(id) { G(id).classList.add('on'); document.body.style.overflow = 'hidden' }
function closeM(id) { G(id).classList.remove('on'); document.body.style.overflow = '' }
function bgC(e, id) { if (e.target.classList.contains('ov')) closeM(id) }
function authTab(t) {
    const il = t === 'l';
    document.querySelectorAll('.tab').forEach((b, i) => b.classList.toggle('on', il ? i === 0 : i === 1));
    G('lpane').style.display = il ? 'block' : 'none'; G('rpane').style.display = il ? 'none' : 'block';
}

/* ── USER MENU ── */
function togUm() { G('um').classList.toggle('open') }
function closeUm() { G('um').classList.remove('open') }
document.addEventListener('click', e => { if (!G('um')?.contains(e.target)) closeUm() });

/* ── CONFIRM ── */
function showConf(title, msg, cb) { G('cf-t').textContent = title; G('cf-m').textContent = msg; G('cf-ok').onclick = () => { closeM('cf'); cb() }; openM('cf') }

/* ── TOAST ── */
function toast(t, msg) {
    const ico = t === 's' ? '✓' : t === 'e' ? '✕' : 'ℹ';
    const el = document.createElement('div');
    el.className = `toast ${t}`;
    el.innerHTML = `<span class="tico">${ico}</span><span class="ttxt">${es(msg)}</span>`;
    G('tw').appendChild(el);
    setTimeout(() => { el.style.cssText = 'opacity:0;transform:translateX(14px);transition:all .3s ease'; setTimeout(() => el.remove(), 320) }, 3800);
}

/* ── UTILS ── */
function G(id) { return document.getElementById(id) }
function es(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
function shwE(id, msg) { const e = G(id); e.textContent = msg; e.classList.add('on') }
function clrE(id) { const e = G(id); e.textContent = ''; e.classList.remove('on') }

/* ── KEYBOARD ── */
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { document.querySelectorAll('.ov.on').forEach(m => { m.classList.remove('on') }); document.body.style.overflow = '' }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); G('si').focus(); G('si').select() }
    // arrow keys navigate gallery when product modal is open
    if (G('pm').classList.contains('on')) {
        if (e.key === 'ArrowLeft') galNav(-1);
        if (e.key === 'ArrowRight') galNav(+1);
    }
});

/* ---- Zoom ---- */
// click-to-zoom for product detail image
const pmImg = document.getElementById('pm-img');
let zoomed = false;

pmImg.addEventListener('click', function () {
    zoomed = !zoomed;
    this.style.transform = zoomed ? 'scale(2)' : 'scale(1)';
    this.style.cursor = zoomed ? 'zoom-out' : 'zoom-in';
});

pmImg.addEventListener('mousemove', function (e) {
    if (!zoomed) return;  // only track mouse when zoomed in
    const rect = this.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    this.style.transformOrigin = `${x}% ${y}%`;
});

pmImg.addEventListener('mouseleave', function () {
    if (!zoomed) return;
    // zoom out automatically when mouse leaves the image
    zoomed = false;
    this.style.transform = 'scale(1)';
    this.style.cursor = 'zoom-in';
    this.style.transformOrigin = 'center center';
});


/* ── INIT ── */
(async function () {
    await Promise.all([loadCats(), loadMe()]);
    await loadProds();
})();