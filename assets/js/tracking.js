/* ===== Bloom Shoes — Google (Analytics / Ads), pixel Meta (Facebook, Instagram) et pixel TikTok =====
 * Les identifiants se règlent dans admin.html (onglet « Offres & infos » → « Publicité & statistiques »).
 * Rien n'est chargé tant qu'aucun identifiant n'est renseigné, ni avant l'accord du visiteur.
 */
(function () {
  'use strict';

  // La page « Rencontre » a son propre pixel (data-suivi="rencontre" sur <body>), distinct de celui de la boutique
  var shopCfg = ((window.BLOOM_CATALOGUE || {}).boutique || {});
  var isRen = document.body && document.body.dataset.suivi === 'rencontre';
  var cfg = (isRen ? (shopCfg.rencontre || {}).suivi : shopCfg.suivi) || {};
  var CONSENT_KEY = 'bloom_consentement';
  function val(k, re) { var v = String(cfg[k] || '').trim(); return re.test(v) ? v : ''; }
  var ids = {
    google: val('google', /^(G|AW|GT)-[A-Z0-9]+$/i),
    googleAds: val('googleAdsConversion', /^AW-\d+\/[\w-]+$/),
    meta: val('meta', /^\d{6,20}$/),
    tiktok: val('tiktok', /^[A-Z0-9]{10,30}$/i)
  };
  var active = !!(ids.google || ids.googleAds || ids.meta || ids.tiktok);
  var loaded = false, queue = [];

  // Les autres scripts appellent bloomTrack('commande', {...}) sans se soucier des pixels
  window.bloomTrack = function (name, d) {
    if (!active) return;
    if (!loaded) { queue.push([name, d]); return; }
    send(name, d || {});
  };
  if (!active) return;

  function load(src) {
    var s = document.createElement('script');
    s.async = true; s.src = src;
    document.head.appendChild(s);
  }

  function start() {
    if (loaded) return;
    loaded = true;
    var googleId = ids.google || (ids.googleAds && ids.googleAds.split('/')[0]);
    if (googleId) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', googleId);
      var adsId = ids.googleAds && ids.googleAds.split('/')[0];
      if (adsId && adsId !== googleId) window.gtag('config', adsId);
      load('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(googleId));
    }
    if (ids.meta) {
      /* Code officiel du pixel Meta */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', ids.meta);
      window.fbq('track', 'PageView');
    }
    if (ids.tiktok) {
      /* Code officiel du pixel TikTok */
      !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']; ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; }; for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]); ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; }; ttq.load = function (e, n) { var i = 'https://analytics.tiktok.com/i18n/pixel/events.js'; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i; ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; ttq._o[e] = n || {}; var o = d.createElement('script'); o.type = 'text/javascript'; o.async = !0; o.src = i + '?sdkid=' + e + '&lib=' + t; var a = d.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a); }; }(window, document, 'ttq');
      window.ttq.load(ids.tiktok);
      window.ttq.page();
    }
    queue.forEach(function (q) { send(q[0], q[1] || {}); });
    queue = [];
  }

  // Événements : « voir_produit » (fiche ouverte), « commande » (commande envoyée sur WhatsApp), « contact » (bouton WhatsApp)
  function send(name, d) {
    var cur = d.devise || 'XOF';
    var item = d.id ? { content_ids: [d.id], content_name: d.nom, content_type: 'product', value: d.prix || 0, currency: cur } : {};
    if (name === 'voir_produit') {
      if (window.gtag) window.gtag('event', 'view_item', { currency: cur, value: d.prix || 0, items: [{ item_id: d.id, item_name: d.nom }] });
      if (window.fbq) window.fbq('track', 'ViewContent', item);
      if (window.ttq) window.ttq.track('ViewContent', item);
    } else if (name === 'commande') {
      if (window.gtag) {
        window.gtag('event', 'generate_lead', { currency: cur, value: d.prix || 0 });
        if (ids.googleAds) window.gtag('event', 'conversion', { send_to: ids.googleAds, value: d.prix || 0, currency: cur });
      }
      if (window.fbq) window.fbq('track', 'Lead', item);
      if (window.ttq) window.ttq.track('SubmitForm', item);
    } else if (name === 'formulaire') {
      // Formulaire envoyé (page Rencontre). L'identifiant d'événement servira à dédupliquer avec l'API de conversion.
      var eid = d.eventId || ('f' + Date.now() + Math.random().toString(36).slice(2, 8));
      window.bloomLastEventId = eid;
      if (window.gtag) window.gtag('event', 'generate_lead');
      if (window.fbq) window.fbq('track', 'Lead', { content_name: d.nom || 'Formulaire' }, { eventID: eid });
      if (window.ttq) window.ttq.track('SubmitForm', { content_name: d.nom || 'Formulaire' });
    } else if (name === 'contact') {
      if (window.gtag) window.gtag('event', 'contact', { method: 'whatsapp' });
      if (window.fbq) window.fbq('track', 'Contact');
      if (window.ttq) window.ttq.track('Contact');
    }
  }

  /* --- Accord du visiteur (cookies de mesure et de publicité) --- */
  var choice = null;
  try { choice = localStorage.getItem(CONSENT_KEY); } catch (e) { /* ignore */ }
  if (choice === 'oui') { start(); return; }
  if (choice === 'non') return;

  var bar = document.createElement('div');
  bar.className = 'consent';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Cookies');
  bar.innerHTML = '<p>Nous utilisons des cookies pour mesurer la fréquentation et améliorer nos publicités (' + [ids.google || ids.googleAds ? 'Google' : '', ids.meta ? 'Facebook, Instagram' : '', ids.tiktok ? 'TikTok' : ''].filter(Boolean).join(', ') + '). ' +
    '<a href="politique-confidentialite.html' + (isRen ? '#rencontre' : '') + '">En savoir plus</a></p>' +
    '<div><button type="button" class="btn btn--orange" data-c="oui">Accepter</button>' +
    '<button type="button" class="btn consent__no" data-c="non">Refuser</button></div>';
  function decide(v) {
    try { localStorage.setItem(CONSENT_KEY, v); } catch (e) { /* ignore */ }
    bar.remove();
    if (v === 'oui') start();
  }
  bar.addEventListener('click', function (e) { if (e.target.dataset.c) decide(e.target.dataset.c); });
  function show() { document.body.appendChild(bar); }
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
