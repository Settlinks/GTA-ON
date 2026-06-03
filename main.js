/**
 * GTA-ON.com — Main JavaScript
 * Connects to Google Apps Script Web App as backend
 * Update GAS_URL with your deployed Google Apps Script Web App URL
 */

// ============================================================
// CONFIG — Replace with your deployed GAS Web App URL
// ============================================================
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  ITEMS_PER_PAGE: 12,
};

// ============================================================
// UTILITIES
// ============================================================

function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3500);
}

async function apiRequest(action, data = {}) {
  const params = new URLSearchParams({ action, ...data });
  const url = `${CONFIG.GAS_URL}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error');
  return res.json();
}

async function apiPost(action, data = {}) {
  const res = await fetch(CONFIG.GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...data }),
    mode: 'no-cors',
  });
  // no-cors returns opaque response; treat as success
  return { success: true };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrice(val, type) {
  if (!val || val === '0') return type === 'request' ? 'Wanted' : 'Free / Contact';
  return `$${Number(val).toLocaleString('en-CA')}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function badgeHtml(type) {
  const map = {
    offer: '<span class="listing-badge badge-offer">Offering</span>',
    request: '<span class="listing-badge badge-request">Wanted</span>',
    rental: '<span class="listing-badge badge-rental">Rental</span>',
  };
  return map[type] || '';
}

// ============================================================
// NAVIGATION
// ============================================================

function initNav() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  // Highlight active link
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
}

// ============================================================
// MODAL
// ============================================================

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
}

window.openModal = openModal;
window.closeModal = closeModal;

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// ============================================================
// LISTING CARD RENDERER
// ============================================================

function renderListingCard(item) {
  const emoji = {
    'Home Services': '🔧', 'Cleaning': '🧹', 'Moving': '🚚',
    'Tutoring': '📚', 'Pet Care': '🐾', 'Child Care': '👶',
    'Landscaping': '🌿', 'Repairs': '🛠️', 'Events': '🎉',
    'Technology': '💻', 'Health': '❤️', 'Vehicle': '🚗',
    'Apartment': '🏠', 'Room': '🛏️', 'Commercial': '🏢',
    'Storage': '📦', 'Equipment': '⚙️', 'Other': '📋',
  }[item.category] || '📋';

  return `
    <div class="listing-card" onclick="showListingDetail('${escapeHtml(item.id)}')">
      <div class="listing-img">
        ${badgeHtml(item.type)}
        <span style="font-size:3rem">${emoji}</span>
      </div>
      <div class="listing-body">
        <div class="listing-category">${escapeHtml(item.category)}</div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <div class="listing-footer">
          <span class="listing-meta">📍 ${escapeHtml(item.city || 'GTA, ON')}</span>
          <span class="listing-price">${formatPrice(item.price, item.type)}</span>
        </div>
      </div>
    </div>`;
}

function renderSkeletons(container, count = 6) {
  container.innerHTML = Array(count).fill(`
    <div class="listing-card">
      <div class="listing-img skeleton" style="height:160px;border-radius:0"></div>
      <div class="listing-body">
        <div class="skeleton" style="height:14px;width:80px;margin-bottom:10px"></div>
        <div class="skeleton" style="height:18px;margin-bottom:8px"></div>
        <div class="skeleton" style="height:14px;margin-bottom:6px"></div>
        <div class="skeleton" style="height:14px;width:60%;margin-bottom:16px"></div>
        <div style="display:flex;justify-content:space-between">
          <div class="skeleton" style="height:14px;width:90px"></div>
          <div class="skeleton" style="height:14px;width:60px"></div>
        </div>
      </div>
    </div>`).join('');
}

// ============================================================
// LISTING DETAIL MODAL
// ============================================================

window._listingsCache = {};

async function showListingDetail(id) {
  openModal('listingModal');
  const detail = document.getElementById('listingDetail');
  detail.innerHTML = '<div style="text-align:center;padding:40px"><div class="loading-spinner" style="border-color:rgba(0,0,0,.15);border-top-color:var(--red);width:32px;height:32px"></div></div>';

  try {
    let item = window._listingsCache[id];
    if (!item) {
      const data = await apiRequest('getListing', { id });
      item = data.listing;
    }
    if (!item) throw new Error('Not found');

    detail.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:20px">
        <div>
          <div class="listing-category">${escapeHtml(item.category)} · ${badgeHtml(item.type)}</div>
          <h2 style="font-family:Syne,sans-serif;font-weight:700;font-size:1.5rem;margin:6px 0">${escapeHtml(item.title)}</h2>
          <p style="font-size:0.85rem;color:var(--gray)">📍 ${escapeHtml(item.city || 'GTA, ON')} &nbsp;·&nbsp; 📅 ${formatDate(item.date)}</p>
        </div>
        <div style="text-align:right">
          <div style="font-family:Syne,sans-serif;font-weight:800;font-size:1.8rem;color:var(--black)">${formatPrice(item.price, item.type)}</div>
          ${item.priceType ? `<div style="font-size:0.8rem;color:var(--gray)">${escapeHtml(item.priceType)}</div>` : ''}
        </div>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:20px;margin-bottom:20px">
        <h4 style="font-weight:700;margin-bottom:10px;font-size:0.9rem">Description</h4>
        <p style="font-size:0.95rem;line-height:1.65;color:#333">${escapeHtml(item.description).replace(/\n/g,'<br>')}</p>
      </div>
      <div style="background:var(--off-white);border-radius:var(--radius);padding:18px;margin-bottom:20px">
        <h4 style="font-weight:700;margin-bottom:12px;font-size:0.9rem">Contact</h4>
        <p style="font-size:0.9rem;margin-bottom:4px">👤 ${escapeHtml(item.name || 'Anonymous')}</p>
        ${item.email ? `<p style="font-size:0.9rem;margin-bottom:4px">✉️ <a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a></p>` : ''}
        ${item.phone ? `<p style="font-size:0.9rem">📞 <a href="tel:${escapeHtml(item.phone)}">${escapeHtml(item.phone)}</a></p>` : ''}
      </div>
      <button class="btn btn-primary btn-full" onclick="window.location='mailto:${escapeHtml(item.email || '')}?subject=Re: ${encodeURIComponent(item.title)}'">
        ✉️ Reply to this listing
      </button>`;
  } catch {
    detail.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>Could not load listing</h3><p>Please try again.</p></div>';
  }
}

// ============================================================
// POST A LISTING FORM
// ============================================================

function initPostForm() {
  const form = document.getElementById('postForm');
  if (!form) return;

  const tabs = form.querySelectorAll('.form-tab');
  const typeInput = form.querySelector('[name="type"]');
  const priceLabel = document.getElementById('priceLabel');
  const priceHelp = document.getElementById('priceHelp');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const val = tab.dataset.type;
      if (typeInput) typeInput.value = val;
      if (priceLabel) priceLabel.textContent = val === 'request' ? 'Budget (optional)' : val === 'rental' ? 'Rent / Period' : 'Price (optional)';
      if (priceHelp) priceHelp.textContent = val === 'rental' ? 'e.g. $1,200/month or $50/day' : 'Leave empty if free or negotiable';
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> Submitting…';
    btn.disabled = true;

    const data = Object.fromEntries(new FormData(form));
    data.date = new Date().toISOString();

    try {
      await apiPost('addListing', data);
      showToast('✅ Listing posted! It will appear shortly.', 'success');
      form.reset();
      tabs.forEach((t, i) => t.classList.toggle('active', i === 0));
      if (typeInput) typeInput.value = 'offer';
    } catch {
      showToast('❌ Something went wrong. Please try again.', 'error');
    } finally {
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  });
}

// ============================================================
// BROWSE / FILTER / SEARCH
// ============================================================

let allListings = [];
let currentFilters = { type: 'all', category: 'all', search: '' };
let currentPage = 1;

async function loadListings() {
  const grid = document.getElementById('listingsGrid');
  if (!grid) return;

  renderSkeletons(grid);

  try {
    const data = await apiRequest('getListings');
    allListings = data.listings || [];
    // Cache for detail view
    allListings.forEach(l => { window._listingsCache[l.id] = l; });
    renderFilteredListings();
  } catch {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">📡</div>
      <h3>Could not connect</h3>
      <p>Make sure the Google Apps Script backend is deployed and the URL is set in js/main.js</p>
    </div>`;
  }
}

function renderFilteredListings() {
  const grid = document.getElementById('listingsGrid');
  const countEl = document.getElementById('listingCount');
  if (!grid) return;

  let filtered = allListings.filter(l => {
    const matchType = currentFilters.type === 'all' || l.type === currentFilters.type;
    const matchCat = currentFilters.category === 'all' || l.category === currentFilters.category;
    const q = currentFilters.search.toLowerCase();
    const matchSearch = !q || l.title?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q);
    return matchType && matchCat && matchSearch;
  });

  if (countEl) countEl.textContent = `${filtered.length} listing${filtered.length !== 1 ? 's' : ''}`;

  const start = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
  const page = filtered.slice(start, start + CONFIG.ITEMS_PER_PAGE);

  if (page.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">🔍</div>
      <h3>No listings found</h3>
      <p>Try adjusting your filters or be the first to post!</p>
      <a href="post.html" class="btn btn-primary">Post a Listing</a>
    </div>`;
    return;
  }

  grid.innerHTML = page.map(renderListingCard).join('');
}

function initBrowseFilters() {
  document.querySelectorAll('[data-filter-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilters.type = btn.dataset.filterType;
      currentPage = 1;
      renderFilteredListings();
    });
  });

  document.querySelectorAll('[data-filter-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilters.category = btn.dataset.filterCat;
      currentPage = 1;
      renderFilteredListings();
    });
  });

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        currentFilters.search = searchInput.value;
        currentPage = 1;
        renderFilteredListings();
      }, 280);
    });
  }
}

// ============================================================
// HOME PAGE — FEATURED LISTINGS
// ============================================================

async function loadFeaturedListings() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  renderSkeletons(grid, 3);
  try {
    const data = await apiRequest('getListings', { limit: 6 });
    const listings = (data.listings || []).slice(0, 6);
    if (listings.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="icon">🌱</div>
        <h3>No listings yet</h3>
        <p>Be the first to post in your community!</p>
        <a href="post.html" class="btn btn-primary">Post Now</a>
      </div>`;
    } else {
      listings.forEach(l => { window._listingsCache[l.id] = l; });
      grid.innerHTML = listings.map(renderListingCard).join('');
    }
  } catch {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">📡</div>
      <h3>Backend not connected yet</h3>
      <p>Deploy the Google Apps Script and update the URL in js/main.js</p>
    </div>`;
  }
}

// ============================================================
// ANIMATED COUNTER
// ============================================================

function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString() + suffix;
    if (current >= target) clearInterval(timer);
  }, 35);
}

function initCounters() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('[data-target]').forEach(animateCounter);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stats-bar').forEach(el => observer.observe(el));
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initCounters();
  initPostForm();
  initBrowseFilters();
  loadFeaturedListings();
  loadListings();
});
