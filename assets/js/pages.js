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
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
