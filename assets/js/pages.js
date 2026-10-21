/* ===== Bloom Shoes — pages d'information (livraison, confidentialité) ===== */
(function () {
  'use strict';
  var shop = (window.BLOOM_CATALOGUE || {}).boutique || {};
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  var num = String(shop.whatsapp || '').replace(/\D/g, '');
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    a.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent('Bonjour ' + (shop.nom || 'Bloom Shoes') + ', j\'ai une question.');
  });
  document.querySelectorAll('[data-shop]').forEach(function (el) {
    var v = getPath(shop, el.dataset.shop);
    if (v !== undefined && v !== null && v !== '') el.textContent = v;
  });
  var s = shop.suivi || {}, noms = [];
  if (s.google || s.googleAdsConversion) noms.push('Google Analytics / Google Ads');
  if (s.meta) noms.push('le pixel Meta (Facebook, Instagram)');
  if (s.tiktok) noms.push('le pixel TikTok');
  document.querySelectorAll('[data-suivi]').forEach(function (el) {
    el.hidden = (el.dataset.suivi === 'oui') !== (noms.length > 0);
  });
  document.querySelectorAll('[data-suivi-liste]').forEach(function (el) { el.textContent = noms.join(', '); });
  document.querySelectorAll('[data-reset-consent]').forEach(function (b) {
    b.addEventListener('click', function () {
      try { localStorage.removeItem('bloom_consentement'); } catch (e) { /* ignore */ }
      location.reload();
    });
  });
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
