/* ===== Bloom Shoes — vérifie que le catalogue affiché est bien le dernier publié =====
 * Le navigateur peut garder une ancienne copie du catalogue (jusqu'à 10 minutes).
 * On télécharge la version à jour ; si elle est différente, on recharge la page une seule fois.
 */
(function () {
  'use strict';
  if (!window.BLOOM_CATALOGUE || !window.fetch) return;
  var shown = JSON.stringify(window.BLOOM_CATALOGUE);
  fetch('data/catalogue.js', { cache: 'reload' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (txt) {
    if (!txt) return;
    var holder = {};
    new Function('window', txt)(holder);
    var fresh = JSON.stringify(holder.BLOOM_CATALOGUE || null);
    if (!holder.BLOOM_CATALOGUE || fresh === shown) return;
    var stamp = fresh.length + ':' + fresh.slice(-40);
    try {
      if (sessionStorage.getItem('bloom_fresh') === stamp) return;
      sessionStorage.setItem('bloom_fresh', stamp);
    } catch (e) { return; }
    location.reload();
  }).catch(function () { /* hors ligne : on garde ce qui est affiché */ });
})();
